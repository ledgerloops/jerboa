import { randomBytes, createHash } from "node:crypto";

import { Graph } from "./Graph.js";
import { Balances } from "./Balances.js";
const MIN_LOOP_WEIGHT = 0.00000001;
// const MAX_LOOP_WEIGHT = 1000000000;
const RANDOM_NEXT_STEP = false;

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

export type TransferMessage = {
  amount: number,
};
export type ProbeMessage = {
  command: string,
  probeId: string,
  debugInfo: {
    path: string[],
    backtracked: string[],
  },
};
export type NackMessage = {
  command: string,
  probeId: string,
  debugInfo: {
    path: string[],
    backtracked: string[],
  },
};
export type ScoutMessage = {
  command: string,
  probeId: string,
  amount: number,
  debugInfo: {
    loop: string[],
  },
};
export type ProposeMessage = {
  command: string,
  probeId: string,
  amount: number,
  hash: string,
  debugInfo: {
    loop: string[],
  },
};
export type CommitMessage = {
  command: string,
  probeId: string,
  amount: number,
  preimage: string,
  debugInfo: {
    loop: string[],
  },
};

export class Jerboa {
  private balances: Balances = new Balances();
  private graph: Graph;
  private name: string;
  private outgoingLinks: {
    [friend: string]: boolean
  } = {};
  private probes: {
    [probeId: string]: {
      in: string[],
      out: string[],
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
  private loopsTried: string[] = [];
  constructor(name: string, graph: Graph) {
    this.name = name;
    this.graph = graph;
  }

  receiveScout(sender: string, msg: ScoutMessage): void {
    const { probeId, amount, debugInfo } = msg;
    // console.log(`${this.name} received a scout message from ${sender} for probeId ${probeId} (amount ${amount})`, this.probes[probeId], debugInfo);
    // unknown probe
    if (typeof this.probes[probeId] === 'undefined') {
      throw new Error(`${this.name} received an unknown probeId ${probeId} in scout message from ${sender}`);
    }
    // no out messages
    if (this.probes[probeId].out.length === 0) {
      throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but have no out messages for that probe`);
    }
    // no in messages
    if (this.probes[probeId].in.length === 0) {
      throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but have no in messages for that probe`);
    }
    // sender not one of the out messages
    if (this.probes[probeId].out.indexOf(sender) === -1) {
      throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but expected it to come from one of ${JSON.stringify(this.probes[probeId].out)}`);
    }
    if (this.name === debugInfo.loop[0]) {
      this.initiatePropose(debugInfo.loop[ debugInfo.loop.length - 2], probeId, amount, debugInfo);
    } else {
      // multiple in messages
      if (this.probes[probeId].in.length > 1) {
        console.log(`${this.name} received a scout message from ${sender} for probeId ${probeId} but have multiple in messages for that probe ${JSON.stringify(this.probes[probeId])}`);
        throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but have multiple in messages for that probe ${JSON.stringify(this.probes[probeId])}`);
      }

      // // multiple out messages
      // if (this.probes[probeId].out.length > 1) {
      //   throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but have multiple out messages for that probe ${JSON.stringify(this.probes[probeId])}`);
      // }
      const forwardTo = this.probes[probeId].in[0];
      const outBalance = this.balances.getBalance(sender);
      let amountOut = amount;
      if (amountOut > outBalance) {
        // console.log(`${this.name} adjust the scout amount from ${amount} to ${outBalance} based on out balance to ${sender}`);
        amountOut = outBalance;
      }
      const inBalance = this.balances.getBalance(sender);
      if (amountOut > inBalance) {
        // console.log(`${this.name} adjust the scout amount from ${amount} to ${inBalance} based on in balance from ${forwardTo}`);
        amountOut = inBalance;
      }
      if (amountOut <= MIN_LOOP_WEIGHT) {
        console.log('scout amount too small');
      } else {
        this.sendScoutMessage(forwardTo, { command: 'scout', probeId, amount: amountOut, debugInfo });
      }
    }
  }
  // assumes all loop hops exist
  scoutLoop(probeId: string, loop: string[]): void {
    if (this.loopsTried.indexOf(loop.join(' ')) !== -1) {
      throw new Error('loop already tried');
    }
    this.loopsTried.push(loop.join(' '));
    // console.log(`${this.name} scouting loop`);
    for (let k = 0; k < loop.length - 1; k++) {
      // console.log(loop, `hop ${loop[k]}->${loop[k+1]}`, this.graph.getNode(loop[k]).getBalance(loop[k+1]), this.graph.getNode(loop[k+1]).getBalance(loop[k]));
      if (this.graph.getNode(loop[k]).getBalance(loop[k+1]) + this.graph.getNode(loop[k+1]).getBalance(loop[k]) !== 0) {
        throw new Error('balance dispute!');
      }
    }
    if (loop.length < 3) {
      throw new Error('loop too short');
    }
    if (loop[0] !== this.name) {
      throw new Error('loop doesnt start here');
    }
    if (loop[loop.length - 1] !== this.name) {
      throw new Error('loop doesnt end here');
    }
    if (this.probes[probeId].in.length === 1) {
      // was minted here, O loop
    } else  if (this.probes[probeId].in.length == 2) {
      // P loop
    } else {
      console.log(this.probes);
      console.log(`expected one or two in events for probe ${probeId}`);
    }
    const incomingNeighbour = loop[loop.length - 2];
    const incomingBalance = this.balances.getBalance(incomingNeighbour);
    // console.log('scoutLoop considering incoming balance', this.name, incomingNeighbour, incomingBalance);
    if (incomingBalance > -MIN_LOOP_WEIGHT) {
      console.log(this.name, incomingNeighbour, incomingBalance, 'incoming balance not negative enough');
      throw new Error('jar');
    } else {
      // console.log('calling sendScoutMessage');
      this.sendScoutMessage(incomingNeighbour, { command: 'scout', probeId, amount: -incomingBalance, debugInfo: { loop } });
    }
    // return;
    // if (this.probes[probeId].out.length === 1) {
    //   // O or P loop, not backtracked
    // } else if (this.probes[probeId].out.length > 1) {
    //     // O or P loop, after having backtracked
    // } else {
    //   console.log(this.probes);
    //   console.log(`expected one or more out events for probe ${probeId}`);
    // }
    // let smallestWeight = Infinity;
    // let found = false;
    // if (loop.length === 0) {
    //   throw new Error('loop has length 0');
    // }
    // // const weights = [];
    // // console.log('finding smallest weight on loop', loop);
    // for (let k = 0; k < loop.length - 1; k++) {
    //   const thisWeight = this.graph.getWeight(loop[k], loop[k+1]);
    //   // weights.push(thisWeight);
    //   if (typeof thisWeight !== 'number') {
    //     throw new Error('weight is not a number');
    //   }
    //   // console.log(`Weight on loop from ${loop[k]} to ${loop[k+1]} is ${thisWeight}`);
    //   if (thisWeight < smallestWeight) {
    //     smallestWeight = thisWeight;
    //     found = true;
    //   }
    // }
    // if (!found) {
    //   throw new Error('not found, weird');
    // }
    // // console.log('smallestWeight found', loop, weights, smallestWeight);
    // return smallestWeight;
  }

  // // assumes all loop hops exist
  // netLoop(smallestWeight: number, loop: string[]): number {
  //   let firstZeroPos;
  //   for (let k = 0; k < loop.length - 1; k++) {
  //     if ((this.graph.getWeight(loop[k], loop[k+1]) === smallestWeight) && (typeof firstZeroPos === 'undefined')) {
  //       firstZeroPos = k;
  //     }
  //     this.graph.addWeight(loop[k], loop[k+1], -smallestWeight);
  //   }
  //   this.graph.report(loop.length - 1, smallestWeight);
  //   return firstZeroPos;
  // }
  sendMessage(to: string, msg: TransferMessage | ProbeMessage | NackMessage | ScoutMessage | ProposeMessage | CommitMessage): void {
    // console.log('sending message', this.name, to, msg);
    this.graph.messaging.sendMessage(this.name, to, msg);
  }
  receiveTransfer(sender: string, msg: TransferMessage): void {
    // console.log(`${sender}->${this.name}: ${amount}`);
    this.balances.adjustReceived(sender, msg.amount);
    this.checkFriendCache(sender);
    // if (this.graph.getNode(this.name).getBalance(sender) + this.graph.getNode(sender).getBalance(this.name) !== 0) {
    //   console.log('Probably some transfer message is still in flight?', this.name, sender, this.graph.getNode(this.name).getBalance(sender), this.graph.getNode(sender).getBalance(this.name));
    // }
  }
  receivePropose(sender: string, msg: ProposeMessage): void {
    const { probeId, amount, hash, debugInfo } = msg;
    if (typeof this.probes[probeId] === 'undefined') {
      throw new Error('propose message for unknown probe!');
    }
    if (typeof this.probes[probeId].loops[hash] === 'undefined') {
      if (this.probes[probeId].in.length === 0) {
        throw new Error('no in events for this probe!');
      }
      if (this.probes[probeId].in.length > 1) {
        throw new Error('too many in events for this probe!');
      }
      const proposeTo = this.probes[probeId].in[0];
      this.probes[probeId].loops[hash] = { proposeTo, proposeFrom: sender, amount };
      this.sendProposeMessage(proposeTo, { command: 'propose', probeId, amount, hash, debugInfo });
    } else {
      // console.log('our hashlock', hash, this.probes[probeId], amount);
      this.probes[probeId].loops[hash].commitTo = sender;
      this.balances.adjustReceived(this.probes[probeId].loops[hash].commitTo, amount);
      this.checkFriendCache(this.probes[probeId].loops[hash].commitTo);
      this.sendCommitMessage(this.probes[probeId].loops[hash].commitTo, { command: 'commit', probeId, amount, preimage: this.probes[probeId].loops[hash].preimage, debugInfo });
    }
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
    this.balances.adjustSent(sender, amount);
    this.checkFriendCache(sender);
    if (typeof this.probes[probeId].loops[hash].proposeFrom === 'undefined') {
      // console.log('loop clearing completed');
      const loop = debugInfo.loop;
      for (let k = 0; k < loop.length - 1; k++) {
        // console.log(loop, `hop ${loop[k]}->${loop[k+1]}`, this.graph.getNode(loop[k]).getBalance(loop[k+1]), this.graph.getNode(loop[k+1]).getBalance(loop[k]));
        if (this.graph.getNode(loop[k]).getBalance(loop[k+1]) + this.graph.getNode(loop[k+1]).getBalance(loop[k]) !== 0) {
          throw new Error('balance dispute!');
        }
      }
      
    } else {
      this.probes[probeId].loops[hash].commitTo = this.probes[probeId].loops[hash].proposeFrom;
      this.balances.adjustReceived(this.probes[probeId].loops[hash].commitTo, amount);
      this.checkFriendCache(this.probes[probeId].loops[hash].commitTo);
      this.sendCommitMessage(this.probes[probeId].loops[hash].commitTo, msg);
    }
  }
  initiatePropose(to: string, probeId: string, amount: number, debugInfo: { loop: string[] }): void {
    const preimage = randomBytes(8).toString("hex");
    const hash = createHash('sha256').update(preimage).digest('base64');
    this.probes[probeId].loops[hash] = { preimage,  proposeTo: to, amount };
    // console.log('initiating propose', this.probes[probeId], { to, probeId, amount, hash, debugInfo });
    this.sendProposeMessage(to, { command: 'propose', probeId, amount, hash, debugInfo });
  }
  receiveNack(nackSender: string, msg: NackMessage): void {
    const { probeId, debugInfo } = msg;
    delete this.outgoingLinks[nackSender];
    if (debugInfo.path.length === 0) {
      const nodes = this.getOutgoingLinks();
      if (nodes.length === 0) {
        if (process.env.PROBING_REPORT) {
          console.log(`finished   (${probeId})`, [], [this.name, nackSender].concat(debugInfo.backtracked));
        }
      } else {
        if (process.env.PROBING_REPORT) {
          console.log(`backtracked (${probeId})`, [ this.name ], [nackSender].concat(debugInfo.backtracked));
        }
        const newStep = randomStringFromArray(nodes);
        // console.log(`${this.name} sends probe message to ${newStep} for probeId ${probeId} after receiving nack from ${nackSender}`);
        this.sendProbeMessage(newStep, { command: 'probe', probeId, debugInfo: { path: debugInfo.path, backtracked: [] } } as ProbeMessage);
      }
    } else {
      // console.log('backtracked', path.concat(this.name), [ nackSender ].concat(backtracked));
      const popped = debugInfo.path.pop();
      // console.log(`                     combining nack sender, internal receiveProbe`, popped, this.name, path, [nackSender].concat(backtracked));
      // console.log(`${this.name} reconsiders probe ${probeId} from ${popped} after receiving nack from ${nackSender}`);
      this.considerProbe(popped, probeId, { path: debugInfo.path, backtracked: [nackSender].concat(debugInfo.backtracked) });
    }
  }
  spliceLoop(sender: string, probeId: string, path: string[]): boolean {
    // chop off loop if there is one:
    const pos = path.indexOf(this.name);
    if (pos !== -1) {
      const loop = path.splice(pos).concat([sender, this.name]);
      this.scoutLoop(probeId, loop);
      // if ((smallestWeight < MIN_LOOP_WEIGHT) || (smallestWeight > MAX_LOOP_WEIGHT)) {
      //   // console.log('ignoring loop with this amount', smallestWeight);
      // } else { 
      //   this.netLoop(smallestWeight, loop);
      // }
      // console.log(`Found loop`, loop, ` pos ${pos}`);
      if (process.env.PROBING_REPORT) {  
        console.log(`found loop (${probeId})`, path, loop);
      }
      return true;
    }
    return false;
  }
  ensureProbe(probeId: string): void {
    if (typeof this.probes[probeId] === 'undefined') {
      this.probes[probeId] = {
        in: [],
        out: [],
        loops: {},
       };
    }
  }
  recordProbeTraffic(other: string, direction: string, probeId: string): void {
    this.ensureProbe(probeId);
    if (this.probes[probeId][direction].indexOf(other) !== -1) {
      console.log(`recording entry ${direction} with ${other} for probe (${probeId})`, this.probes[probeId]);
      throw new Error('repeated entry!');
    }
    this.probes[probeId][direction].push(other);
    // if (direction === 'in') {
    //   console.log(`${this.name} recorded ${direction}coming probe (${probeId}) from ${other}`, this.probes[probeId]);
    // } else {
    //   console.log(`${this.name} recorded ${direction}going probe (${probeId}) to ${other}`, this.probes[probeId]);
    // }
  }
  probeAlreadySent(probeId: string, to: string): boolean {
    if (typeof this.probes[probeId] === 'undefined') {
      console.log(`unknown probe ${probeId} was not sent to anyone yet`);
      return false;
    }
    const ret = (this.probes[probeId].out.indexOf(to) !== -1);
    // console.log(`probe ${probeId} was sent to`,this.probes[probeId].out, `(checking whether ${to} is in that list: ${ret})`);
    return ret;
  }
  receiveProbe(sender: string, msg: ProbeMessage): void {
    const { probeId, debugInfo } = msg;
    // console.log(`${this.name} recording probe traffic in from receiveProbe "${probeId}"`, debugInfo.path.concat([sender, this.name]));
    this.recordProbeTraffic(sender, 'in', probeId);
    this.considerProbe(sender, probeId, debugInfo);
  }
  considerProbe(sender: string, probeId: string, debugInfo: { path: string[], backtracked: string[] }): void {
    const loopFound = this.spliceLoop(sender, probeId, debugInfo.path);
    if (loopFound) {
      if (debugInfo.path.length >= 1) {
        // console.log('                   continuing by popping old sender from', path);
        const oldSender = debugInfo.path.pop();
        this.considerProbe(oldSender, probeId, { path: debugInfo.path, backtracked: [] });
      }
      return;
    }
    // console.log('path after splicing', path);
    const nodes = this.getOutgoingLinks().filter(x => {
      const verdict = (this.probeAlreadySent(probeId, x) === false);
      // console.log(`${this.name} has checked the suitability of possible next hop ${x} for probe ${probeId} -> ${verdict}`);
      return verdict;
    });
    // console.log('forwarding probe to first option from', this.getOutgoingLinks(), nodes);
    if (nodes.length === 0) {
      // console.log(`                     combining self, sending nack ${this.name}->${sender}`, path, backtracked);
      this.sendNackMessage(sender, probeId, debugInfo);
      return;
    } else if (debugInfo.backtracked.length > 0) {
      if (process.env.PROBING_REPORT) {
        console.log(`backtracked (${probeId})`, debugInfo.path.concat([sender, this.name]), debugInfo.backtracked);
      }
    }
    // console.log('         did we print?', sender, this.name, path, backtracked);
    debugInfo.path.push(sender);
    const newStep = randomStringFromArray(nodes);
    // console.log(`forwarding from ${this.name} to ${newStep} (balance ${this.balances.getBalance(newStep)})`);
    this.sendProbeMessage(newStep, { command: 'probe', probeId, debugInfo: { path: debugInfo.path, backtracked: [] } });
  };
  receiveMessage(from: string, msg: TransferMessage | ProbeMessage | NackMessage | ScoutMessage | ProposeMessage | CommitMessage ): void {
    // console.log('receiveMessage', from, this.name, msg);
    switch((msg as { command: string }).command) {
      case 'probe': {
        return this.receiveProbe(from, msg as ProbeMessage);
      }
    case 'nack': {
      return this.receiveNack(from, msg as NackMessage);
    }
    case 'transfer': {
      return this.receiveTransfer(from, msg as TransferMessage);
    }
    case 'scout': {
      return this.receiveScout(from, msg as ScoutMessage);
    }
    case 'propose': {
      return this.receivePropose(from, msg as ProposeMessage);
    }
    case 'commit': {
      return this.receiveCommit(from, msg as CommitMessage);
    }
    default:
      console.log(from, this.name, msg);
      throw new Error('unknown task');
    }
  }
  checkFriendCache(friend: string): void {
    const newBalance = this.balances.getBalance(friend);
    if (newBalance > MIN_LOOP_WEIGHT) {
      this.outgoingLinks[friend] = true;
    } else {
      delete this.outgoingLinks[friend];
      if (Object.keys(this.outgoingLinks).length === 0) {
        this.graph.deregister(this.name);
      }
    }
  }
  addWeight(to: string, weight: number): void {
    this.balances.adjustSent(to, weight);
    this.checkFriendCache(to);
    this.sendTransferMessage(to, weight);
  }
  getOutgoingLinks(): string[] {
    return Object.keys(this.outgoingLinks);
  }
  getBalance(to: string): number {
    return this.balances.getBalance(to);
  }
  getBalances(): { [to: string]: number } {
    return this.balances.getBalances();
  }
  getArchiveWeights(): { [to: string]: number } {
    return this.balances.getArchiveWeights(this.name);
  }
  sendProbeMessage(to: string, msg: ProbeMessage): void {
    // console.log(`${this.name} recording probe traffic out sendProbeMessage to ${to}`, msg.debugInfo);
    this.recordProbeTraffic(to, 'out', msg.probeId);
    this.sendMessage(to, msg);
  }
  sendNackMessage(to: string, probeId: string, debugInfo: { path: string[], backtracked: string[] }): void {
    this.sendMessage(to, { command: 'nack', probeId, debugInfo });
  }
  sendTransferMessage(to: string, amount: number): void {
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
    // console.log(`Node ${this.name} starting probe ${probeId}`);
    const nodes = this.getOutgoingLinks();
    if (nodes.length === 0) {
      return false;
    }
    this.sendProbeMessage(nodes[0], { command: 'probe', probeId, debugInfo: { path: [], backtracked: [] } });
    return true;
  }
}