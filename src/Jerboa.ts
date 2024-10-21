import { createHash } from "node:crypto";
import { Balances } from "./Balances.js";
import { Message, TransferMessage, ProposeMessage, CommitMessage, ScoutMessage, ProbeMessage, NackMessage } from "./MessageTypes.js";
import { printLine } from "./BirdsEyeWorm.js";
import { genRanHex } from "./genRanHex.js";

const RANDOM_NEXT_STEP = false;
const LEDGER_SCALE = 1000000;

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
      out: { [from: string]: number },
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
  probeQueue: {
    sender: string;
    probeId: string;
    incarnation: number;
    debugInfo: {
      path: string[];
      backtracked: string[];
    }
  }[] = [];
  currentProbe: {
    sender: string;
    probeId: string;
    incarnation: number;
    debugInfo: {
      path: string[];
      backtracked: string[];
    }
  } | undefined;
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
  private solutionCallback: (line: string) => Promise<void> | undefined;
  private maybeRunProbeTimer;
  constructor(name: string, solutionCallback: (line: string) => Promise<void> | undefined, sendMessage: (to: string, message: Message) => void) {
    this.name = name;
    this.solutionCallback = solutionCallback;
    this.sendMessageCb = sendMessage;
    this.maybeRunProbeTimer = setInterval(() => {
      if (this.probeQueue.length && this.currentProbe === undefined) {
        // console.log(`Node ${this.name} has work`);
        this.maybeRunProbe();
      } else {
        // console.log(`Node ${this.name} is done`);
        clearInterval(this.maybeRunProbeTimer);
      }
    }, 1000);
  }
  private sendMessage(to: string, message: Message): void {
    if (this.solutionCallback) {
      this.solutionCallback(`${this.name} ${to} ${JSON.stringify(message)}\n`);
    }
    this.messagesSent++;
    this.sendMessageCb(to, message);
  }
  public getNumProbesMinted(): number {
    return this.probeMinter;
  }
  private pickIncarnation(probeId: string, maxIncarnation: number): string {
    const numOptions = Object.keys(this.probes[probeId].in).length;
    if (numOptions === 0) {
      console.log(probeId, maxIncarnation, this.probes[probeId]);
      throw new Error('no probe senders to pick from!');
    }
    if (numOptions === 1) {
      return Object.keys(this.probes[probeId].in)[0];
    }
    // console.log(`${this.name} received a message for probeId (${probeId}:${maxIncarnation}) but have multiple in messages for that probe ${JSON.stringify(this.probes[probeId])}`);
    let bestPickProbeSender;
    let bestPickIncarnation = -1;
    Object.keys(this.probes[probeId].in).forEach((probeSender: string) => {
      if (this.probes[probeId].in[probeSender] > maxIncarnation) {
        // console.log('discarding newer incarnation', probeSender, this.probes[probeId].in[probeSender]);
      } else if (this.probes[probeId].in[probeSender] > bestPickIncarnation) {
        bestPickProbeSender = probeSender;
        bestPickIncarnation = this.probes[probeId].in[probeSender];
        // console.log('best pick so far', bestPickProbeSender, bestPickIncarnation);
      }
    });
    if (typeof bestPickProbeSender === 'undefined') {
      throw new Error(`${this.name} received a scout message for probeId (${probeId}:${maxIncarnation}) but all probe senders were from higher incarnations? ${JSON.stringify(this.probes[probeId])}`);
    }
    return bestPickProbeSender;

  }
  async receiveScout(sender: string, msg: ScoutMessage): Promise<void> {
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
      this.initiatePropose(debugInfo.loop[ debugInfo.loop.length - 2], probeId, incarnation, amount, debugInfo);
      if (this.solutionCallback) {
        const line = debugInfo.loop.slice(0, debugInfo.loop.length - 1).concat(amount.toString()).join(' ') + '\n';
        // console.log('Writing to solution file', this.solutionFile, line);
        await this.solutionCallback(line);
      }
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
      const outBalance = this.balances.getBalance(sender);
      let amountOut = BigInt(Math.round(amount * LEDGER_SCALE));
      if (amountOut > outBalance) {
        // console.log(`${this.name} adjust the scout amount from ${amount} to ${outBalance} based on out balance to ${sender}`);
        amountOut = outBalance;
      }
      const inBalance = this.balances.getBalance(sender);
      if (amountOut > inBalance) {
        // console.log(`${this.name} adjust the scout amount from ${amount} to ${inBalance} based on in balance from ${forwardTo}`);
        amountOut = inBalance;
      }
      if (amountOut === 0n) {
        // console.log('scout amount too small');
      } else {
        this.sendScoutMessage(forwardTo, { command: 'scout', probeId, maxIncarnation: incarnation, amount: Number(amountOut) / LEDGER_SCALE, debugInfo });
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
    const incomingBalance = this.balances.getBalance(incomingNeighbour);
    // console.log('scoutLoop considering incoming balance', this.name, incomingNeighbour, incomingBalance);
    if (incomingBalance === 0n) {
      // console.log(this.name, incomingNeighbour, incomingBalance, 'incoming balance not negative enough');
      return;
    } else {
      // console.log('calling sendScoutMessage');
      this.sendScoutMessage(incomingNeighbour, { command: 'scout', probeId, maxIncarnation: incarnation,  amount: Number(-incomingBalance) / LEDGER_SCALE, debugInfo: { loop } });
    }
  }
  receiveTransfer(sender: string, msg: TransferMessage): void {
    // console.log(`${sender}->${this.name}: ${amount}`);
    this.adjustReceived(sender, msg.amount);
    this.checkFriendCache(sender);
    // if (this.balances.haveIncomingAndOutgoingLinks()) {
    //   this.startProbe(`${this.name}-${this.probeMinter++}`);
    // }
    // if (this.graph.getNode(this.name).getBalance(sender) + this.graph.getNode(sender).getBalance(this.name) !== 0) {
    //   console.log('Probably some transfer message is still in flight?', this.name, sender, this.graph.getNode(this.name).getBalance(sender), this.graph.getNode(sender).getBalance(this.name));
    // }
  }
  receivePropose(sender: string, msg: ProposeMessage): void {
    const { probeId, maxIncarnation, amount, hash, debugInfo } = msg;
    if (typeof this.probes[probeId] === 'undefined') {
      throw new Error('propose message for unknown probe!');
    }
    if (typeof this.probes[probeId].loops[hash] === 'undefined') {
      const proposeTo = this.pickIncarnation(probeId, maxIncarnation);
      this.probes[probeId].loops[hash] = { proposeTo, proposeFrom: sender, amount };
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
    const { probeId, amount, preimage } = msg;
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
    this.adjustSent(sender, amount);
    this.checkFriendCache(sender);
    if (typeof this.probes[probeId].loops[hash].proposeFrom === 'undefined') {
      // console.log('loop clearing completed');
    } else {
      this.probes[probeId].loops[hash].commitTo = this.probes[probeId].loops[hash].proposeFrom;
      this.adjustReceived(this.probes[probeId].loops[hash].commitTo, amount);
      this.checkFriendCache(this.probes[probeId].loops[hash].commitTo);
      this.sendCommitMessage(this.probes[probeId].loops[hash].commitTo, msg);
    }
    if (this.currentProbe?.probeId === msg.probeId) {
      // console.log(`Node ${this.name} received commit for current probe ${msg.probeId}`);
      this.currentProbe = undefined;
    }
  }
  initiatePropose(to: string, probeId: string, incarnation: number, amount: number, debugInfo: { loop: string[] }): void {
    const preimage = genRanHex(8);
    const hash = createHash('sha256').update(preimage).digest('base64');
    this.probes[probeId].loops[hash] = { preimage,  proposeTo: to, amount };
    // console.log('initiating propose', this.probes[probeId], { to, probeId, amount, hash, debugInfo });
    this.sendProposeMessage(to, { command: 'propose', probeId, maxIncarnation: incarnation, amount, hash, debugInfo });
  }
  receiveNack(nackSender: string, msg: NackMessage): void {
    const { probeId, incarnation, debugInfo } = msg;
    delete this.outgoingLinks[nackSender];
    if (debugInfo.path.length === 0) {
      const nodes = this.getOutgoingLinks();
      if (nodes.length === 0) {
        if (process.env.PROBING_REPORT) {
          printLine(`finished   (${probeId}:${incarnation})`, [], [this.name, nackSender].concat(debugInfo.backtracked));
        }
      } else {
        if (process.env.PROBING_REPORT) {
          console.log(`backtrack21 (${probeId}:${incarnation})`, [ this.name ], [nackSender].concat(debugInfo.backtracked));
        }
        const newStep = randomStringFromArray(nodes);
        // console.log(`${this.name} sends probe message to ${newStep} for probeId ${probeId} after receiving nack from ${nackSender}`);
        this.sendProbeMessage(newStep, { command: 'probe', probeId, incarnation: incarnation + 1, debugInfo: { path: debugInfo.path, backtracked: [] } } as ProbeMessage);
      }
    } else {
      // console.log('backtracked', path.concat(this.name), [ nackSender ].concat(backtracked));
      const popped = debugInfo.path.pop();
      // console.log(`                     combining nack sender, internal receiveProbe`, popped, this.name, path, [nackSender].concat(backtracked));
      // console.log(`${this.name} reconsiders probe ${probeId} from ${popped} after receiving nack from ${nackSender}`);
      this.probeQueue.push({
        sender: popped,
        probeId,
        incarnation,
        debugInfo: { path: debugInfo.path, backtracked: [nackSender].concat(debugInfo.backtracked) }
      });
      this.maybeRunProbe();
    }
  }
  spliceLoop(sender: string, probeId: string, incarnation: number, path: string[]): boolean {
    // chop off loop if there is one:
    const pos = path.indexOf(this.name);
    if (pos !== -1) {
      const loop = path.splice(pos).concat([sender, this.name]);
      this.changeToLooper(sender, probeId, incarnation);
      this.scoutLoop(probeId, incarnation, loop);
      // if ((smallestWeight < MIN_LOOP_WEIGHT) || (smallestWeight > MAX_LOOP_WEIGHT)) {
      //   // console.log('ignoring loop with this amount', smallestWeight);
      // } else {
      //   this.netLoop(smallestWeight, loop);
      // }
      // console.log(`Found loop`, loop, ` pos ${pos}`);
      if (process.env.PROBING_REPORT) {
        printLine(`Node ${this.name} found loop (${probeId}:${incarnation}`, path, loop);
      }
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
    // if (direction === 'in') {
    //   console.log(`${this.name} recorded ${direction}coming probe incarnation (${probeId}:${incarnation}) from ${other}`, this.probes[probeId]);
    // } else if (direction === 'looper') {
    //   console.log(`${this.name} recorded ${direction} probe incarnation (${probeId}:${incarnation}) from ${other}`, this.probes[probeId]);
    // } else {
    //   console.log(`${this.name} recorded ${direction}going probe incarnation (${probeId}:${incarnation}) to ${other}`, this.probes[probeId]);
    // }
  }
  probeAlreadySent(probeId: string, to: string): boolean {
    if (typeof this.probes[probeId] === 'undefined') {
      console.log(`unknown probe ${probeId} was not sent to anyone yet`);
      return false;
    }
    const ret = (typeof this.probes[probeId].out[to] !== 'undefined');
    // console.log(`probe ${probeId} was sent to`,this.probes[probeId].out, `(checking whether ${to} is in that list: ${ret})`);
    return ret;
  }
  receiveProbe(sender: string,  msg: ProbeMessage): void {
    const { probeId, incarnation, debugInfo } = msg;
    // console.log(`${this.name} recording probe traffic in from receiveProbe "${probeId}"`, debugInfo.path.concat([sender, this.name]));
    this.recordProbeTraffic(sender, 'in', probeId, incarnation);
    this.probeQueue.push({
      sender,
      probeId,
      incarnation,
      debugInfo
    });
    // console.log(`${this.name} pushed to queue`, {
    //   sender,
    //   probeId,
    //   incarnation,
    //   debugInfo
    // });
    this.maybeRunProbe();
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
  considerProbe(sender: string, probeId: string, incarnation: number, debugInfo: { path: string[], backtracked: string[] }): boolean {
    const loopFound = this.spliceLoop(sender, probeId, incarnation, debugInfo.path);
    if (loopFound) {
      if (debugInfo.path.length >= 1) {
        // console.log('                   continuing by popping old sender from', path);
        const oldSender = debugInfo.path.pop();
        this.probeQueue.push({
          sender: oldSender,
          probeId,
          incarnation: incarnation + 1,
          debugInfo: { path: debugInfo.path, backtracked: [] },
        });
        // this.currentProbe = undefined;
        // this.maybeRunProbe();
      }
      return true;
    }
    // console.log('path after splicing', path);
    const nodes = this.getOutgoingLinks().filter(x => {
      const verdict = (this.probeAlreadySent(probeId, x) === false);
      // console.log(`${this.name} has checked the suitability of possible next hop ${x} for probe ${probeId} -> ${verdict}`);
      return verdict;
    });
    // console.log(`Node ${this.name} is forwarding probe to first option from`, this.getOutgoingLinks(), nodes);
    if (nodes.length === 0) {
      // console.log(`                     combining self, sending nack ${this.name}->${sender}`, path, backtracked);
      this.sendNackMessage(sender, probeId, incarnation, debugInfo);
      // console.log(`Node ${this.name} is done with probe ${probeId}`);
      this.currentProbe = undefined;
      return false;
    } else if (debugInfo.backtracked.length > 0) {
      if (process.env.PROBING_REPORT) {
        printLine(`backtracked (${probeId}:${incarnation})`, debugInfo.path.concat([sender, this.name]), debugInfo.backtracked);
      }
      incarnation++;
    }
    // console.log('         did we print?', sender, this.name, path, backtracked);
    debugInfo.path.push(sender);
    const newStep = randomStringFromArray(nodes);
    // console.log(`forwarding from ${this.name} to ${newStep} (balance ${this.balances.getBalance(newStep)})`);
    this.sendProbeMessage(newStep, { command: 'probe', probeId, incarnation, debugInfo: { path: debugInfo.path, backtracked: [] } });
    return true;
  };
  async receiveMessage(from: string, msg: Message ): Promise<void> {
    this.messagesReceived++;
    // console.log('Jerboa receiveMessage', from, this.name, msg);
    switch((msg as { command: string }).command) {
      case 'probe': {
        return this.receiveProbe(from, msg as ProbeMessage);
      }
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
      // if (Object.keys(this.outgoingLinks).length === 0) {
        // console.log('calling deregister');
        // this.deregister();
      // }
    }
  }
  addWeight(to: string, weight: number): void {
    this.adjustSent(to, weight);
    this.checkFriendCache(to);
    this.sendTransferMessage(to, weight);
    setTimeout(() => {
       if (this.balances.haveIncomingAndOutgoingLinks()) {
        this.startProbe(`${this.name}-${this.probeMinter++}`);
      }
    }, 1000);
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
    // console.log(`${this.name} recording probe traffic out sendProbeMessage to ${to}`, msg.debugInfo);
    this.recordProbeTraffic(to, 'out', msg.probeId, msg.incarnation);
    this.sendMessage(to, msg);
  }
  sendNackMessage(to: string, probeId: string, incarnation: number, debugInfo: { path: string[], backtracked: string[] }): void {
    this.sendMessage(to, { command: 'nack', probeId, incarnation, debugInfo });
  }
  sendTransferMessage(to: string, amount: number): void {
    this.transfersSent++;
    this.transfersSentAmount += amount;
    this.sendMessage(to, { command: 'transfer', amount });
  }
  sendScoutMessage(to: string, msg: ScoutMessage): void {
    this.sendMessage(to, msg);
  }
  sendProposeMessage(to: string, msg: ProposeMessage): void {
    this.sendMessage(to, msg);
  }
  sendCommitMessage(to: string, msg: CommitMessage): void {
    this.sendMessage(to, msg);
  }
  startProbe(probeId: string): boolean {
    this.probeQueue.push({ sender: null, probeId, incarnation: 0, debugInfo: { path: [], backtracked: [] } });
    return this.maybeRunProbe();
  }
  maybeRunProbe(): boolean {
    if ((this.probeQueue.length > 0) && ((this.currentProbe === undefined) || (this.currentProbe.probeId === this.probeQueue[0].probeId))) {
      // console.log(`Node ${this.name} maybeRunProbe ${this.probeQueue[0]?.probeId} -> yes`, (this.probeQueue.length > 0), (this.currentProbe === undefined), (this.currentProbe?.probeId === this.probeQueue[0]?.probeId));
      this.currentProbe = this.probeQueue.shift();
      // console.log(`Node ${this.name} is busy with probe ${this.currentProbe.probeId}: ${JSON.stringify(this.currentProbe.debugInfo.path)}`);
      // console.log('running probe', this.currentProbe);
      const result = this.runCurrentProbe();
      return result;
    }
    // console.log(`Node ${this.name} maybeRunProbe ${this.probeQueue[0]?.probeId} -> no`, (this.probeQueue.length > 0), (this.currentProbe === undefined), (this.currentProbe?.probeId === this.probeQueue[0]?.probeId));
    return false;
  }
  runCurrentProbe(): boolean {
    if (this.currentProbe === undefined) {
      throw new Error('there is no current probe');
    }
    if (this.currentProbe.sender === null) {
      // console.log(`Node ${this.name} starting probe ${this.currentProbe.probeId}`);
      const nodes = this.getOutgoingLinks();
      // console.log('got outgoing links', nodes);
      if (nodes.length === 0) {
        // console.log('returning false on startProbe');
        return false;
      }
      this.sendProbeMessage(nodes[0], { command: 'probe', probeId: this.currentProbe.probeId, incarnation: this.currentProbe.incarnation, debugInfo: this.currentProbe.debugInfo });
      // console.log('returning true on startProbe');
      return true;
    } else {
      return this.considerProbe(this.currentProbe.sender, this.currentProbe.probeId, this.currentProbe.incarnation, this.currentProbe.debugInfo);
    }
  }
}
