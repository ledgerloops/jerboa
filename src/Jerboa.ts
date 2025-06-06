import { createHash } from "node:crypto";
import { Balances } from "./Balances.js";
import { Message, TransferMessage, ProposeMessage, CommitMessage, ScoutMessage, ProbeMessage, NackMessage, stringifyMessage } from "./MessageTypes.js";
import { printLine } from "./BirdsEyeWorm.js";
import { genRanHex } from "./genRanHex.js";

const RANDOM_NEXT_STEP = false;
const LEDGER_SCALE = 1000000;
const MAX_TRANSFER_AMOUNT = 1000000;
const MAX_INCARNATION = 10000;

export type JerboaOptions = {
  name: string,
  solutionCallback: (line: string) => void,
  sendMessage: (to: string, message: Message) => void,
};

function randomStringFromArray(arr: string[]): string {
  if (!Array.isArray(arr)) {
    throw new Error('not an array!');
  }
  if (arr.length === 0) {
    throw new Error('array is empty!');
  }
  if (RANDOM_NEXT_STEP) {
    const pick = Math.floor(Math.random() * arr.length);
    return arr[pick];
  } else {
    return arr[0];
  }
}

export type ProbeInfo = {
  sender: string;
  probeId: string;
  incarnation: number;
  debugInfo: {
    path: string[];
    backtracked?: string[];
  }
};

export class Jerboa {
  private balances: Balances = new Balances();
  private name: string;
  private outgoingLinks: {
    [friend: string]: boolean
  } = {};
  private probes: {
    [probeId: string]: {
      in: { [from: string]: number },
      looper: { [from: string]: number },
      out: { [to: string]: number },
      currentOut?: string,
      loops: {
        [hash: string]: {
          proposeFrom?: string,
          commitFrom?: string,
          proposeTo?: string,
          commitTo?: string,
          preimage?: string,
          amount?: number,
        }
      },
      preimage?: string,
      hash?: string,
    }
  } = {};
  // private follow: {
  //   [probeId: string]: {
  //      from: string;
  //      to?: string;
  //      incarnation: number;
  //      followee: string;
  //   }
  // } = {};
  // probeQueue: ProbeInfo[] = [];
  currentProbeIds: string[] = [];
  private probeMinter: number = 0;
  public transfersReceived: number = 0;
  public messagesReceived: number = 0;
  public transfersSent: number = 0;
  public messagesSent: number = 0;
  public transfersSentAmount: number = 0;
  public transfersReceivedAmount: number = 0;
  public multilateralNum: number = 0;
  public multilateralAmount: number = 0;
  public getBilateralStats(): {
    num: number;
    amount: number;
  } {      
    const balanceStats = this.balances.getBilateralStats();
    return {
      num: balanceStats.num,
      amount: Number(balanceStats.amount) / LEDGER_SCALE,
    };
  }
  // private netted: {
  //   [loopLength: number]: number;
  // } = {};
  private sendMessageCb: (to: string, message: Message) => void;
  private loopsTried: string[] = [];
  private solutionCallback: (line: string) => void;
  private whenDone: (value: unknown) => void;
  // private maybeRunProbeTimer;
  constructor(options: JerboaOptions) {
    this.name = options.name;
    this.solutionCallback = options.solutionCallback;
    this.sendMessageCb = options.sendMessage;
  }
  getCurrentProbeIds(): string[] {
    return this.currentProbeIds;
  } 
  private debug(str: string): void {
    if (process.env.VERBOSE) {
      console.log(str);
      // this.solutionCallback(str);
    }
  }
  // private stringifyProbeInfo(probeInfo: ProbeInfo | undefined): string {
  //   if (probeInfo === undefined) {
  //     return 'undefined';
  //   }
  //   return `{${probeInfo.sender}->${this.name} = ${probeInfo.probeId}:${probeInfo.incarnation} = ${JSON.stringify(probeInfo.debugInfo.path)} = ${JSON.stringify(probeInfo.debugInfo.backtracked)} }`;
  // }
  public reportState(cb: (string) => void): void {
    const line = `Node ${this.name} currentprobes=[${this.currentProbeIds.join(' ')}] OUT:[${this.getOutgoingLinks().join(',')}]`;
    cb(line);
  }
  private async sendMessage(to: string, message: Message): Promise<void> {
    this.debug(`SEND ${this.name} ${to} ${JSON.stringify(message)}`);
    this.messagesSent++;
    this.sendMessageCb(to, message);
  }
  public getNumProbesMinted(): number {
    return this.probeMinter;
  }
  private pickIncarnation(probeId: string, maxIncarnation: number): string {
    const numOptions = Object.keys(this.probes[probeId].in).length;
    if (numOptions === 0) {
      // console.log(probeId, maxIncarnation, this.probes[probeId]);
      throw new Error('no probe senders to pick from!');
    }
    if (numOptions === 1) {
      return Object.keys(this.probes[probeId].in)[0];
    }
    // console.log(`${this.name} received a message for probeId (${probeId}:${maxIncarnation}) but have multiple in messages for that probe ${JSON.stringify(this.probes[probeId])}`);
    let bestPickProbeSender;
    let bestPickIncarnation = -1;
    this.debug(`picking incarnation for ${probeId}:${maxIncarnation}- ` + JSON.stringify(this.probes[probeId].in));
    Object.keys(this.probes[probeId].in).forEach((probeSender: string) => {
      if (this.probes[probeId].in[probeSender] > maxIncarnation) {
        this.debug(`discarding newer incarnation ${probeSender} ${this.probes[probeId].in[probeSender]}`);
      } else if (this.probes[probeId].in[probeSender] > bestPickIncarnation) {
        bestPickProbeSender = probeSender;
        bestPickIncarnation = this.probes[probeId].in[probeSender];
        this.debug(`best pick so far ${bestPickProbeSender} ${bestPickIncarnation}`);
      }
    });
    if (typeof bestPickProbeSender === 'undefined') {
      throw new Error(`${this.name} received a scout message for probeId (${probeId}:${maxIncarnation}) but all probe senders were from higher incarnations? ${JSON.stringify(this.probes[probeId])}`);
    }
    return bestPickProbeSender;

  }
  receiveScout(sender: string, msg: ScoutMessage): void {
    const { probeId, amount, maxIncarnation: incarnation, debugInfo } = msg;
    if (debugInfo.loop.indexOf(this.name) === -1) {
      throw new Error(`${this.name} received scout message but not on the loop ${JSON.stringify(msg)}`);
    }
    if (debugInfo.loop.indexOf(sender) === -1) {
      throw new Error(`${this.name} received scout message from ${sender} who is not on the loop ${JSON.stringify(msg)}`);
    }
    // console.log(`${this.name} received a scout message from ${sender} for probeId ${probeId} (amount ${amount})`, this.probes[probeId], debugInfo);
    // unknown probe
    if (typeof this.probes[probeId] === 'undefined') {
      throw new Error(`${this.name} received an unknown probeId ${probeId} in scout message from ${sender}`);
    }
    // no out messages
    if (Object.keys(this.probes[probeId].out).length === 0) {
      throw new Error(`${this.name} received a scout message from ${sender} for probeId (${probeId}:${incarnation}) but have no out messages for that probe`);
    }
    // sender not one of the out messages
    if (typeof this.probes[probeId].out[sender] === 'undefined') {
      throw new Error(`${this.name} received a scout message from ${sender} for probeId (${probeId}:${incarnation}) but expected it to come from one of ${JSON.stringify(this.probes[probeId].out)}`);
    }
    if (this.name === debugInfo.loop[0]) {
      // no looper messages
      if (Object.keys(this.probes[probeId].looper).length === 0) {
        throw new Error(`${this.name} looped a scout message from ${sender} for probeId ${probeId} but have no looper messages for that probe`);
      }
      const outBalance = this.getBalance(sender);
      let amountOut = Math.round(amount);
      if (amountOut > outBalance) {
        this.debug(`Initiator ${this.name} now adjust the scout amount for (${msg.probeId}:${msg.maxIncarnation}-) based on out balance to ${sender} from ${amountOut} to ${outBalance}`);
        amountOut = outBalance;
      } else {
        this.debug(`Initiator ${this.name} is still OK with scout amount for (${msg.probeId}:${msg.maxIncarnation}-) based on out balance to ${sender} because ${amountOut} <= ${outBalance}`);
      }
      this.initiatePropose(debugInfo.loop[ debugInfo.loop.length - 2], probeId, incarnation, amountOut, debugInfo);
    } else {
      // no in messages
      if (Object.keys(this.probes[probeId].in).length === 0) {
        throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but have no in messages for that probe`);
      }

      const forwardTo = this.pickIncarnation(probeId, incarnation);
      if (debugInfo.loop.indexOf(forwardTo) === -1) {
        throw new Error(`${this.name} picked ${forwardTo} who is not on the loop ${JSON.stringify(msg)} - ${JSON.stringify(this.probes[probeId])}`);
      }

      // // multiple out messages
      // if (Object.keys(this.probes[probeId].out).length > 1) {
      //   throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but have multiple out messages for that probe ${JSON.stringify(this.probes[probeId])}`);
      // }
      const outBalance = this.getBalance(sender);
      let amountOut = Math.round(amount * LEDGER_SCALE) / LEDGER_SCALE;
      if (amountOut > outBalance) {
        this.debug(`${this.name} adjust the scout amount for (${msg.probeId}:${msg.maxIncarnation}-) based on out balance to ${sender} from ${amountOut} to ${outBalance}`);
        amountOut = outBalance;
      } else {
        this.debug(`${this.name} is OK with scout amount for (${msg.probeId}:${msg.maxIncarnation}-) based on out balance to ${sender} because ${amountOut} <= ${outBalance}`);
      }
      const inBalance = this.getBalance(sender);
      if (amountOut > inBalance) {
        this.debug(`${this.name} adjust the scout amount (${msg.probeId}:${msg.maxIncarnation}-) based on in balance from ${forwardTo} from ${amountOut} to ${inBalance}`);
        amountOut = inBalance;
      } else {
        this.debug(`${this.name} is OK with scout amount for (${msg.probeId}:${msg.maxIncarnation}-) based on in balance from ${forwardTo} because ${amountOut} <= ${inBalance}`);
      }
      if (amountOut === 0) {
        // console.log('scout amount too small');
      } else {
        this.sendScoutMessage(forwardTo, { command: 'scout', probeId, maxIncarnation: incarnation, amount: amountOut, debugInfo });
      }
    }
  }
  // assumes all loop hops exist
  scoutLoop(probeId: string, incarnation: number, loop: string[]): void {
    if (this.loopsTried.indexOf(loop.join(' ')) !== -1) {
      // console.log('loop already tried');
    }
    this.loopsTried.push(loop.join(' '));
    // console.log(`${this.name} scouting loop`);
    // for (let k = 0; k < loop.length - 1; k++) {
    //   if (Math.abs(this.graph.getNode(loop[k]).getBalance(loop[k+1]) + this.graph.getNode(loop[k+1]).getBalance(loop[k])) > MIN_LOOP_WEIGHT) {
    //     console.log('(temporary?) balance dispute', loop, `hop ${loop[k]}->${loop[k+1]}`, this.graph.getNode(loop[k]).getBalance(loop[k+1]), this.graph.getNode(loop[k+1]).getBalance(loop[k]));
    //   }
    // }
    if (loop.length < 3) {
      throw new Error('loop too short');
    }
    if (loop[0] !== this.name) {
      throw new Error('loop doesnt start here');
    }
    if (loop[loop.length - 1] !== this.name) {
      throw new Error('loop doesnt end here');
    }
    const incomingNeighbour = loop[loop.length - 2];
    const incomingBalance = this.getBalance(incomingNeighbour);
    // console.log('scoutLoop considering incoming balance', this.name, incomingNeighbour, incomingBalance);
    if (incomingBalance === 0) {
      // console.log(this.name, incomingNeighbour, incomingBalance, 'incoming balance not negative enough');
      return;
    } else if (incomingBalance < 0) {
      // console.log('calling sendScoutMessage');
      this.debug(`Initiator ${this.name} sets scout amount for (${probeId}:${incarnation}-) to incoming balance ${-incomingBalance}`);
      this.sendScoutMessage(incomingNeighbour, { command: 'scout', probeId, maxIncarnation: incarnation,  amount: -incomingBalance, debugInfo: { loop } });
    }
  }
  receiveTransfer(sender: string, msg: TransferMessage): void {
    // console.log(`${sender}->${this.name}: ${amount}`);
    this.adjustReceived(sender, msg.amount);
    this.checkFriendCache(sender);
    if (this.balances.haveIncomingAndOutgoingLinks()) {
      this.debug(`transfer receiver ${this.name} starts probe`);
      this.startProbe();
    }
    // if (this.graph.getNode(this.name).getBalance(sender) + this.graph.getNode(sender).getBalance(this.name) !== 0) {
    //   console.log('Probably some transfer message is still in flight?', this.name, sender, this.graph.getNode(this.name).getBalance(sender), this.graph.getNode(sender).getBalance(this.name));
    // }
  }
  receivePropose(sender: string, msg: ProposeMessage): void {
    const { probeId, maxIncarnation, amount, hash, debugInfo } = msg;
    if (amount < 0) {
      return;
    }
    if (typeof this.probes[probeId] === 'undefined') {
      throw new Error('propose message for unknown probe!');
    }
    if (typeof this.probes[probeId].loops[hash] === 'undefined') {
      const proposeTo = this.pickIncarnation(probeId, maxIncarnation);
      this.probes[probeId].loops[hash] = { proposeTo, proposeFrom: sender, amount };
      if (-this.getBalance(proposeTo) < msg.amount) {
        this.debug(`Node ${this.name} is not interested in proposal from ${sender} (${-this.getBalance(proposeTo)} < ${msg.amount})`);
        return;
      }
      this.sendProposeMessage(proposeTo, { command: 'propose', probeId, maxIncarnation, amount, hash, debugInfo });
    } else {
      // console.log('our hashlock', hash, this.probes[probeId], amount);
      this.probes[probeId].loops[hash].commitTo = sender;
      this.adjustReceived(this.probes[probeId].loops[hash].commitTo, amount);
      this.checkFriendCache(this.probes[probeId].loops[hash].commitTo);
      this.sendCommitMessage(this.probes[probeId].loops[hash].commitTo, { command: 'commit', probeId, amount, preimage: this.probes[probeId].loops[hash].preimage, debugInfo });
    }
  }
  adjustSent(sender: string, amount: number): void {
    const bigIntAmount = BigInt(Math.round(amount * LEDGER_SCALE));
    this.balances.adjustSent(sender, bigIntAmount);
  }
  adjustReceived(sender: string, amount: number): void {
    const bigIntAmount = BigInt(Math.round(amount * LEDGER_SCALE));
    this.balances.adjustReceived(sender, bigIntAmount);
  }
  receiveCommit(sender: string, msg: CommitMessage): void {
    const { probeId, amount, preimage, debugInfo } = msg;
    if (typeof this.probes[probeId] === 'undefined') {
      throw new Error('commit message for unknown probe!');
    }
    const hash = createHash('sha256').update(preimage).digest('base64');
    if (typeof this.probes[probeId].loops[hash] === 'undefined') {
      console.log({ hash, preimage, probes: this.probes });
      throw new Error('commit preimage looks wrong');
    }
    this.probes[probeId].loops[hash].preimage = preimage;
    this.probes[probeId].loops[hash].commitFrom = sender;
    this.debug(`Node ${this.name} adjustSent for ${sender} to ${this.getBalance(sender)}+${amount} while processing commit`);
    this.adjustSent(sender, amount);
    this.checkFriendCache(sender);
    if (typeof this.probes[probeId].loops[hash].proposeFrom === 'undefined') {
      // console.log('loop clearing completed');
      this.solutionCallback(`${debugInfo.loop.slice(0, debugInfo.loop.length - 1).join(' ')} ${amount}`);
    } else {
      this.probes[probeId].loops[hash].commitTo = this.probes[probeId].loops[hash].proposeFrom;
      this.adjustReceived(this.probes[probeId].loops[hash].commitTo, amount);
      this.checkFriendCache(this.probes[probeId].loops[hash].commitTo);
      this.sendCommitMessage(this.probes[probeId].loops[hash].commitTo, msg);
    }
    if (this.currentProbeIds.indexOf(msg.probeId) !== -1) {
      // console.log(`Node ${this.name} received commit for current probe ${msg.probeId}`);
      this.doneWithCurrentProbe('commit', msg.probeId);
    }
  }
  doneWithCurrentProbe(reason: string, probeId: string): void {
    this.debug(`${this.name} is done with current probe ${probeId} due to ${reason}`);
    const index = this.currentProbeIds.indexOf(probeId);
    if (index > -1) { // only splice array when item is found
      this.currentProbeIds.splice(index, 1); // 2nd parameter means remove one item only
    }
    // this.resumeProbeQueue();
    if (this.whenDone) {
      this.whenDone(undefined);
      delete this.whenDone;
    }
  }
  initiatePropose(to: string, probeId: string, incarnation: number, amount: number, debugInfo: { loop: string[] }): void {
    const preimage = genRanHex(8);
    const hash = createHash('sha256').update(preimage).digest('base64');
    this.probes[probeId].loops[hash] = { preimage,  proposeTo: to, amount };
    // console.log('initiating propose', this.probes[probeId], { to, probeId, amount, hash, debugInfo });
    if (amount > 0) {
      this.sendProposeMessage(to, { command: 'propose', probeId, maxIncarnation: incarnation, amount, hash, debugInfo });
    }
  }
  receiveNack(nackSender: string, msg: NackMessage): void {
    const { probeId, incarnation, debugInfo } = msg;
    // Not repeating outgoing links is now handled by probeAlreadySent
    // delete this.outgoingLinks[nackSender];
    if (debugInfo.path.length === 0) {
      const nodes = this.getOutgoingLinks().filter(friend => {
        const verdict = (this.probeAlreadySent(probeId, friend) === false);
        this.debug(`${this.name} has checked the suitability of possible next hop ${friend} for probe ${probeId} (balance: ${this.balances.getBalance(friend)} -> ${verdict}`);
        return verdict;
      });
      if (nodes.length === 0) {
        this.debug(`(${probeId}:${incarnation}) / ${[this.name, nackSender].concat(debugInfo.backtracked).join(' ')}`);
        if (this.currentProbeIds.indexOf(probeId) === -1) {
          this.debug(`Node ${this.name} received Nack from ${nackSender} for probe ${msg.probeId}:${msg.incarnation} but current probes are [${this.currentProbeIds.join(' ')}]`);
        }
        this.doneWithCurrentProbe('nack-and-finished', probeId);
      } else {
        this.debug(`(${probeId}:${incarnation}) ${this.name} / ${[nackSender].concat(debugInfo.backtracked).join(' ')}`);
        // console.log(`${this.name} sends probe message to ${newStep} for probeId ${probeId} after receiving nack from ${nackSender}`);
        this.debug(`${this.name} received nack from ${nackSender} for its own probe (${probeId}:${incarnation}) and switches to next incarnation (${probeId}:${incarnation + 1})`);
        if (incarnation > MAX_INCARNATION) {
          throw new Error('incarnation getting too high!');
        }
        this.runProbe({ sender: null, probeId, incarnation: incarnation + 1, debugInfo: { path: debugInfo.path } } as ProbeInfo);
      }
    } else {
      // console.log('backtracked', path.concat(this.name), [ nackSender ].concat(backtracked));
      const popped = debugInfo.path.pop();
      // console.log(`                     combining nack sender, internal receiveProbe`, popped, this.name, path, [nackSender].concat(backtracked));
      this.debug(`${this.name} reconsiders probe ${probeId} from ${popped} after receiving nack from ${nackSender}`);
      this.considerProbe({
        sender: popped,
        probeId,
        incarnation,
        debugInfo: { path: debugInfo.path, backtracked: [nackSender].concat(debugInfo.backtracked) }
      });
    }
  }
  spliceLoop(sender: string, probeId: string, incarnation: number, path: string[]): boolean {
    // chop off loop if there is one:
    const pos = path.indexOf(this.name);
    if (pos !== -1) {
      const loop = path.splice(pos).concat([sender, this.name]);
      this.changeToLooper(sender, probeId, incarnation);
      this.scoutLoop(probeId, incarnation, loop);
      return true;
    }
    return false;
  }
  ensureProbe(probeId: string): void {
    if (typeof this.probes[probeId] === 'undefined') {
      this.probes[probeId] = {
        in: {},
        looper: {},
        out: {},
        loops: {},
       };
    }
  }
  recordProbeTraffic(other: string, direction: string, probeId: string, incarnation: number): void {
    this.ensureProbe(probeId);
    if (typeof this.probes[probeId][direction][other] !== 'undefined') {
      console.log(`recording entry ${direction} with ${other} for probe (${probeId})`, this.probes[probeId]);
      // throw new Error('repeated entry!');
    }
    this.probes[probeId][direction][other] = incarnation;
    if (direction === 'out') {
      this.probes[probeId].currentOut = other;
    }
    // if (direction === 'in') {
    //   console.log(`${this.name} recorded ${direction}coming probe incarnation (${probeId}:${incarnation}) from ${other}`, this.probes[probeId]);
    // } else if (direction === 'looper') {
    //   console.log(`${this.name} recorded ${direction} probe incarnation (${probeId}:${incarnation}) from ${other}`, this.probes[probeId]);
    // } else {
    //   console.log(`${this.name} recorded ${direction}going probe incarnation (${probeId}:${incarnation}) to ${other}`, this.probes[probeId]);
    // }
  }
  probeAlreadySent(probeId: string, to: string): boolean {
    // console.log('probeAlreadySent', probeId, this.name, to, this.probes);
    if (typeof this.probes[probeId] === 'undefined') {
      // console.log(`unknown probe ${probeId} was not sent to anyone yet`);
      return false;
    }
    const ret = (typeof this.probes[probeId].out[to] !== 'undefined');
    // console.log(`probe ${probeId} was sent to`,this.probes[probeId].out, `(checking whether ${to} is in that list: ${ret})`);
    return ret;
  }
  receiveProbe(sender: string,  msg: ProbeMessage): void {
    const { probeId, incarnation, debugInfo } = msg;
    this.debug(`${this.name} recording probe traffic in from receiveProbe "${probeId}" [${debugInfo.path.concat([sender, this.name]).join(' ')}]`);
    this.recordProbeTraffic(sender, 'in', probeId, incarnation);
    this.runProbe({ sender, probeId: msg.probeId, incarnation: msg.incarnation, debugInfo: msg.debugInfo });
  }
  changeToLooper(sender: string, probeId: string, incarnation: number): void {
    if (typeof this.probes[probeId] === 'undefined') {
      throw new Error('probe record not found');
    }
    if (typeof this.probes[probeId].in[sender] === 'undefined') {
      throw new Error('in record not found');
    }
    if (this.probes[probeId].in[sender] !== incarnation) {
      throw new Error('in record has wrong incarnation');
    }
    this.probes[probeId].looper[sender] = this.probes[probeId].in[sender];
    delete this.probes[probeId].in[sender];
  }
  considerProbe(probeInfo: ProbeInfo): boolean {
    const { sender, probeId, incarnation, debugInfo } = probeInfo;
    if (this.currentProbeIds.length > 0 && this.currentProbeIds.indexOf(probeInfo.probeId) === -1) {
      console.log('already busy with another probe');
      this.sendNackMessage(sender, probeId, incarnation, { path: debugInfo.path, backtracked: [] });
      return false;
    } else {
      console.log('considering probe', probeInfo);
    }

    if (this.balances.getBalance(sender) >= 0) {
      this.debug(`${this.name} nacks counter-balance probe ${probeId}:${incarnation} from ${sender}`);
      this.sendNackMessage(sender, probeId, incarnation, { path: debugInfo.path, backtracked: [] });
      return false;
    }
    const loopFound = this.spliceLoop(sender, probeId, incarnation, debugInfo.path);
    if (loopFound) {
      if (debugInfo.path.length >= 1) {
        // console.log('                   continuing by popping old sender from', path);
        const oldSender = debugInfo.path.pop();
        this.runProbe({
          sender: oldSender,
          probeId,
          incarnation: incarnation + 1,
          debugInfo: { path: debugInfo.path },
        });
      } else {
        this.startProbe();
      }
      return true;
    }
    // console.log('path after splicing', path);
    const nodes = this.getOutgoingLinks().filter(x => {
      const verdict = (this.probeAlreadySent(probeId, x) === false);
      this.debug(`${this.name} has checked the suitability of possible next hop ${x} for probe ${probeId} -> ${verdict}`);
      return verdict;
    });
    // this.debug(`Node ${this.name} is forwarding probe to first option from ${this.getOutgoingLinks().length}`);
    let forwardIncarnation = incarnation;
    if (nodes.length === 0) {
      this.debug(`no outgoing links, so sending nack ${this.name}->${sender} ${probeId}:${incarnation} [${debugInfo.path.join(' ')}] []`);
      this.doneWithCurrentProbe('leaf', probeId);
      this.sendNackMessage(sender, probeId, incarnation, { path: debugInfo.path, backtracked: debugInfo.backtracked || [] });
      // this.debug(`Node ${this.name} is done with probe ${probeId}`);
      return false;
    } else if (Array.isArray(debugInfo.backtracked) && debugInfo.backtracked.length > 0) {
      if (process.env.PROBING_REPORT) {
        printLine(`backtracked (${probeId}:${incarnation})`, debugInfo.path.concat([sender, this.name]), debugInfo.backtracked);
      }
      this.debug(`(${probeId}:${incarnation}) ${debugInfo.path.concat([sender, this.name]).join(' ')} / ${(debugInfo.backtracked || []).join(' ')}`);
      forwardIncarnation++;
    }
    // console.log('         did we print?', sender, this.name, path, backtracked);
    debugInfo.path.push(sender);
    const newStep = randomStringFromArray(nodes);
    // console.log(`forwarding from ${this.name} to ${newStep} (balance ${this.balances.getBalance(newStep)})`);
    this.sendProbeMessage(newStep, { command: 'probe', probeId, incarnation: forwardIncarnation, debugInfo: { path: debugInfo.path } });
    return true;
  }
  async receiveMessage(from: string, msg: Message ): Promise<void> {
    this.debug(`RCV[${from}->${this.name}]${stringifyMessage(msg)}`);
    this.messagesReceived++;
    // console.log('Jerboa receiveMessage', from, this.name, msg);
    switch((msg as { command: string }).command) {
      case 'probe': {
        return this.receiveProbe(from, msg as ProbeMessage);
      }
      // case 'follow': {
      //   return this.receiveFollow(from, msg as FollowMessage);
      // }
      case 'nack': {
        return this.receiveNack(from, msg as NackMessage);
      }
      case 'transfer': {
        this.transfersReceived++;
        this.transfersReceivedAmount += (msg as TransferMessage).amount;
        return this.receiveTransfer(from, msg as TransferMessage);
      }
      case 'scout': {
        return this.receiveScout(from, msg as ScoutMessage);
      }
      case 'propose': {
        return this.receivePropose(from, msg as ProposeMessage);
      }
      case 'commit': {
        this.multilateralNum ++;
        this.multilateralAmount += (msg as CommitMessage).amount;
        return this.receiveCommit(from, msg as CommitMessage);
      }
      default:
        console.log(from, this.name, msg);
        throw new Error('unknown task');
    }
  }
  checkFriendCache(friend: string): void {
    const newBalance = this.balances.getBalance(friend);
    if (newBalance > 0n) {
      this.outgoingLinks[friend] = true;
    } else {
      delete this.outgoingLinks[friend];
    }
  }
  addWeight(to: string, weight: number): void {
    this.debug(`Node ${this.name} adjustSent for ${to} to ${this.getBalance(to)}+${weight} while processing addWeight`);
    this.adjustSent(to, weight);
    this.checkFriendCache(to);
    this.sendTransferMessage(to, weight);
    this.debug(`transfer ${this.name} -> ${to}`);
  }
  async startProbe(): Promise<void> {
    const probeId = `${this.name}-${this.probeMinter++}`;
    this.debug(`${this.name} starts probe ${probeId}`);
    const promise = new Promise(resolve => this.whenDone = resolve);
    this.runProbe({ sender: null, probeId, incarnation: 0, debugInfo: { path: [], backtracked: [] } });
    await promise;
  }
  runProbe(probeInfo: ProbeInfo): void {
    if (this.currentProbeIds.filter(id => id !== probeInfo.probeId).length > 0) {
      console.log('runProbe returns', this.currentProbeIds);
      this.sendNackMessage(probeInfo.sender, probeInfo.probeId, probeInfo.incarnation, { path: probeInfo.debugInfo.path, backtracked: [] });
      return;
    }
    this.currentProbeIds.push(probeInfo.probeId);
    console.log('runProbe runs', this.currentProbeIds);

    if (probeInfo.sender === null) {
      // console.log(`Node ${this.name} starting probe ${probeInfo.probeId}`);
      this.debug(`Node ${this.name} starting probe ${probeInfo.probeId}:${probeInfo.incarnation} [${this.name}]`);
      const nodes = this.getOutgoingLinks().filter(x => {
        const verdict = (this.probeAlreadySent(probeInfo.probeId, x) === false);
        this.debug(`${this.name} has checked the suitability of possible next hop ${x} for probe ${probeInfo.probeId} -> ${verdict}`);
        return verdict;
      });
      // console.log('got outgoing links', nodes);
      if (nodes.length === 0) {
        // console.log('returning false on startProbe');
        this.doneWithCurrentProbe('non-starter', probeInfo.probeId);
        // this.resumeProbeQueue();
        return;
      }
      this.sendProbeMessage(nodes[0], { command: 'probe', probeId: probeInfo.probeId, incarnation: probeInfo.incarnation, debugInfo: probeInfo.debugInfo });
      // console.log('returning true on startProbe');
      return;
    } else {
      this.debug(`Node ${this.name} considering probe ${probeInfo.probeId}:${probeInfo.incarnation} [${probeInfo.debugInfo.path.concat([probeInfo.sender, this.name]).join(' ')}]`);
      this.considerProbe(probeInfo);
    }
  }

  getOutgoingLinks(): string[] {
    return Object.keys(this.outgoingLinks);
  }
  getBalance(to: string): number {
    return Number(this.balances.getBalance(to)) / LEDGER_SCALE;
  }
  getBalances(): { [to: string]: number } {
    const bigIntBalances = this.balances.getBalances();
    const ret = {};
    Object.keys(bigIntBalances).forEach(key => {
      ret[key] = Number(bigIntBalances[key]) / LEDGER_SCALE;
    });
    return ret;
  }
  sendProbeMessage(to: string, msg: ProbeMessage): void {
    if (this.currentProbeIds.indexOf(msg.probeId) === -1) {
      throw new Error(`Unwilling to send probe message for (${msg.probeId}:${msg.incarnation}) if this.currentProbeIds are [${this.currentProbeIds.join(' ')}]`);
    }

    // console.log(`${this.name} recording probe traffic out sendProbeMessage to ${to}`, msg.debugInfo);
    this.recordProbeTraffic(to, 'out', msg.probeId, msg.incarnation);
    this.sendMessage(to, msg);
  }
  // sendFollowMessage(to: string, msg: FollowMessage): void {
  //   if (to === undefined) {
  //     return;
  //   }
  //   this.recordProbeTraffic(to, 'out', msg.probeId, msg.incarnation);
  //   this.sendMessage(to, msg);
  // }
  sendNackMessage(to: string, probeId: string, incarnation: number, debugInfo: { path: string[], backtracked: string[] }): void {
    delete this.probes[probeId].in[to];
    this.sendMessage(to, { command: 'nack', probeId, incarnation, debugInfo });
  }
  sendTransferMessage(to: string, amount: number): void {
    if (amount > MAX_TRANSFER_AMOUNT) {
      throw new Error(`Transfer amount too big ${amount}`);
    }
    this.transfersSent++;
    this.transfersSentAmount += amount;
    this.sendMessage(to, { command: 'transfer', amount });
  }
  sendScoutMessage(to: string, msg: ScoutMessage): void {
    if (msg.amount > MAX_TRANSFER_AMOUNT) {
      // throw new Error(`Attempt to send scout message with amount ${msg.amount}`);
      // console.log(`Attempt to send scout message with amount ${msg.amount}`);
      return;
    }
    this.sendMessage(to, msg);
  }
  sendProposeMessage(to: string, msg: ProposeMessage): void {
    this.sendMessage(to, msg);
  }
  sendCommitMessage(to: string, msg: CommitMessage): void {
    this.sendMessage(to, msg);
  }
}
