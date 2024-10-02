import { randomBytes, createHash } from "node:crypto";

import { Graph } from "./Graph.js";
import { Balances } from "./Balances.js";
const MIN_LOOP_WEIGHT = 0.00000001;
const MAX_LOOP_WEIGHT = 1000000000;
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
        }
      },
      preimage?: string,
      hash?: string,
    }
  } = {};
  constructor(name: string, graph: Graph) {
    this.name = name;
    this.graph = graph;
  }

  receiveScout(sender: string, probeId: string, amount: number, debugInfo: { loop: string[] }): void {
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
    // multiple in messages
    if (this.probes[probeId].in.length > 1) {
      throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but have multiple in messages for that probe ${JSON.stringify(this.probes[probeId].out)}`);
    }
    // sender not one of the out messages
    if (this.probes[probeId].out.indexOf(sender) === -1) {
      throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but expected it to come from one of ${JSON.stringify(this.probes[probeId].out)}`);
    }
    if (this.name === debugInfo.loop[0]) {
      this.initiatePropose(debugInfo.loop[ debugInfo.loop.length - 2], probeId, amount, debugInfo);
    } else {
      // // multiple out messages
      // if (this.probes[probeId].out.length > 1) {
      //   throw new Error(`${this.name} received a scout message from ${sender} for probeId ${probeId} but have multiple out messages for that probe ${JSON.stringify(this.probes[probeId].out)}`);
      // }
      const forwardTo = this.probes[probeId].in[0];
      const outBalance = this.balances.getBalance(sender);
      if (amount > outBalance) {
        console.log(`${this.name} adjust the scout amount from ${amount} to ${outBalance} based on out balance to ${sender}`);
        amount = outBalance;
      }
      const inBalance = this.balances.getBalance(sender);
      if (amount > inBalance) {
        console.log(`${this.name} adjust the scout amount from ${amount} to ${inBalance} based on in balance from ${forwardTo}`);
        amount = inBalance;
      }
      this.sendScoutMessage(forwardTo, probeId, amount, debugInfo);
    }
  }
  // assumes all loop hops exist
  getSmallestWeight(probeId: string, loop: string[]): number {
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
    this.sendScoutMessage(incomingNeighbour, probeId, this.balances.getBalance(incomingNeighbour), { loop });
    if (this.probes[probeId].out.length === 1) {
      // O or P loop, not backtracked
    } else if (this.probes[probeId].out.length > 1) {
        // O or P loop, after having backtracked
    } else {
      console.log(this.probes);
      console.log(`expected one or more out events for probe ${probeId}`);
    }
    let smallestWeight = Infinity;
    let found = false;
    if (loop.length === 0) {
      throw new Error('loop has length 0');
    }
    // const weights = [];
    // console.log('finding smallest weight on loop', loop);
    for (let k = 0; k < loop.length - 1; k++) {
      const thisWeight = this.graph.getWeight(loop[k], loop[k+1]);
      // weights.push(thisWeight);
      if (typeof thisWeight !== 'number') {
        throw new Error('weight is not a number');
      }
      // console.log(`Weight on loop from ${loop[k]} to ${loop[k+1]} is ${thisWeight}`);
      if (thisWeight < smallestWeight) {
        smallestWeight = thisWeight;
        found = true;
      }
    }
    if (!found) {
      throw new Error('not found, weird');
    }
    // console.log('smallestWeight found', loop, weights, smallestWeight);
    return smallestWeight;
  }

  // assumes all loop hops exist
  netLoop(smallestWeight: number, loop: string[]): number {
    let firstZeroPos;
    for (let k = 0; k < loop.length - 1; k++) {
      if ((this.graph.getWeight(loop[k], loop[k+1]) === smallestWeight) && (typeof firstZeroPos === 'undefined')) {
        firstZeroPos = k;
      }
      this.graph.addWeight(loop[k], loop[k+1], -smallestWeight);
    }
    this.graph.report(loop.length - 1, smallestWeight);
    return firstZeroPos;
  }
  sendMessage(to: string, task: string[]): void {
    this.graph.messaging.sendMessage(this.name, to, task);
  }
  receiveTransfer(sender: string, amount: number): void {
    // console.log(`${sender}->${this.name}: ${amount}`);
    this.balances.adjustReceived(sender, amount);
    this.checkFriendCache(sender);
  }
  receivePropose(sender: string, probeId: string, amount: number, hash: string, debugInfo: { loop: string[] }): void {
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
      this.probes[probeId].loops[hash] = { proposeTo, proposeFrom: sender };
      this.sendProposeMessage(proposeTo, probeId, amount, hash, debugInfo);
    } else {
      // console.log('our hashlock', hash, this.probes[probeId]);
      this.balances.adjustReceived(sender, amount);
      this.sendCommitMessage(sender, probeId, amount, this.probes[probeId].loops[hash].preimage, debugInfo);
    }
  }
  receiveCommit(sender: string, probeId: string, amount: number, preimage: string, debugInfo: { loop: string[] }): void {
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
    if (typeof this.probes[probeId].loops[hash].proposeFrom === 'undefined') {
      // console.log('loop clearing completed');
    } else {
      this.sendCommitMessage(this.probes[probeId].loops[hash].proposeFrom, probeId, amount, preimage, debugInfo);
    }
  }
  initiatePropose(to: string, probeId: string, amount: number, debugInfo: { loop: string[] }): void {
    const preimage = randomBytes(8).toString("hex");
    const hash = createHash('sha256').update(preimage).digest('base64');
    this.probes[probeId].loops[hash] = { preimage,  proposeTo: to };
    // console.log('initiating propose', this.probes[probeId], { to, probeId, amount, hash, debugInfo });
    this.sendProposeMessage(to, probeId, amount, hash, debugInfo);
  }
  receiveNack(nackSender: string, probeId: string, debugInfo: { path: string[], backtracked: string[] }): void {
    delete this.outgoingLinks[nackSender];
    if (debugInfo.path.length === 0) {
      const nodes = this.getOutgoingLinks();
      if (nodes.length === 0) {
        if (process.env.PROBING_REPORT) {
          console.log('finished   ', [], [this.name, nackSender].concat(debugInfo.backtracked));
        }
      } else {
        if (process.env.PROBING_REPORT) {
          console.log('backtracked', [ this.name ], [nackSender].concat(debugInfo.backtracked));
        }
        const newStep = randomStringFromArray(nodes);
        // console.log(`${this.name} sends probe message to ${newStep} for probeId ${probeId} after receiving nack from ${nackSender}`);
        this.sendProbeMessage(newStep, probeId, { path: debugInfo.path, backtracked: [] });
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
      const smallestWeight = this.getSmallestWeight(probeId, loop);
      if ((smallestWeight < MIN_LOOP_WEIGHT) || (smallestWeight > MAX_LOOP_WEIGHT)) {
        // console.log('ignoring loop with this amount', smallestWeight);
      } else { 
        this.netLoop(smallestWeight, loop);
      }
      // console.log(`Found loop`, loop, ` pos ${pos}`);
      if (process.env.PROBING_REPORT) {  
        console.log(`found loop `, path, loop);
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
      console.log(`recording entry ${direction} with ${other} for ${probeId}`, this.probes[probeId]);
      throw new Error('repeated entry!');
    }
    this.probes[probeId][direction].push(other);
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
  receiveProbe(sender: string, probeId: string, debugInfo: { path: string[], backtracked: string[] }): void {
    this.recordProbeTraffic(sender, 'in', probeId);
    // console.log(`receiveProbe "${probeId}"`, debugInfo.path.concat([sender, this.name]));
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
        console.log(`backtracked`, debugInfo.path.concat([sender, this.name]), debugInfo.backtracked);
      }
    }
    // console.log('         did we print?', sender, this.name, path, backtracked);
    debugInfo.path.push(sender);
    const newStep = randomStringFromArray(nodes);
    // console.log(`forwarding from ${this.name} to ${newStep} (balance ${this.balances.getBalance(newStep)})`);
    this.sendProbeMessage(newStep, probeId, { path: debugInfo.path, backtracked: [] });
  };
  receiveMessage(from: string, parts: string[]): void {
    // console.log('receiveMessage', from, this.name, parts);
    switch(parts[0]) {
      case 'probe': {
        const probeId = parts[1];
        const debugInfo: {
          path: string[],
          backtracked: string[]
        } = JSON.parse(parts[2]);
        return this.receiveProbe(from, probeId, debugInfo);
      }
    case 'nack': {
      const probeId = parts[1];
      const debugInfo: {
        path: string[],
        backtracked: string[]
      } = JSON.parse(parts[2]);
      return this.receiveNack(from, probeId, debugInfo);
    }
    case 'transfer': {
      return this.receiveTransfer(from, JSON.parse(parts[1]) as number);
    }
    case 'scout': {
      const probeId = parts[1];
      const amount: number = JSON.parse(parts[2]);
      const debugInfo: {
        loop: string[]
      } = JSON.parse(parts[3]);
      return this.receiveScout(from, probeId, amount, debugInfo);
    }
    case 'propose': {
      // ['propose', probeId, JSON.stringify(amount), hash, JSON.stringify(amount), JSON.stringify(debugInfo)]
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [ _command, probeId, amountStr, hash, debugInfoStr ] = parts;
      return this.receivePropose(from, probeId, JSON.parse(amountStr) as number, hash, JSON.parse(debugInfoStr) as { loop: string[] });
    }
    case 'commit': {
      // ['commit', probeId, JSON.stringify(amount), preimage, JSON.stringify(amount), JSON.stringify(debugInfo)]
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [ _command, probeId, amountStr, preimage, debugInfoStr ] = parts;
      return this.receiveCommit(from, probeId, JSON.parse(amountStr) as number, preimage, JSON.parse(debugInfoStr) as { loop: string[] });
    }
    default:
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
  sendProbeMessage(to: string, probeId: string, debugInfo: object): void {
    // console.log(`sendProbeMessage ${this.name} => ${to}`, debugInfo);
    this.recordProbeTraffic(to, 'out', probeId);
    this.sendMessage(to, ['probe', probeId, JSON.stringify(debugInfo)]);
  }
  sendNackMessage(to: string, probeId: string, debugInfo: object): void {
    this.sendMessage(to, ['nack', probeId, JSON.stringify(debugInfo)]);
  }
  sendTransferMessage(to: string, weight: number): void {
    this.sendMessage(to, ['transfer', JSON.stringify(weight)]);
  }
  sendScoutMessage(to: string, probeId: string, amount: number, debugInfo: { loop: string[] }): void {
    this.sendMessage(to, ['scout', probeId, JSON.stringify(amount), JSON.stringify(debugInfo)]);
  }
  sendProposeMessage(to: string, probeId: string, amount: number, hash: string, debugInfo: { loop: string[] }): void {
    this.sendMessage(to, ['propose', probeId, JSON.stringify(amount), hash, JSON.stringify(amount), JSON.stringify(debugInfo)]);
  }
  sendCommitMessage(to: string, probeId: string, amount: number, preimage: string, debugInfo: { loop: string[] }): void {
    this.sendMessage(to, ['commit', probeId, JSON.stringify(amount), preimage, JSON.stringify(amount), JSON.stringify(debugInfo)]);
  }
  startProbe(probeId: string): boolean {
    // console.log(`Node ${this.name} starting probe ${probeId}`);
    const nodes = this.getOutgoingLinks();
    if (nodes.length === 0) {
      return false;
    }
    this.sendProbeMessage(nodes[0], probeId, { path: [], backtracked: [] });
    return true;
  }
}