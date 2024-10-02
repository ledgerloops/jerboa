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
    }
  } = {};
  constructor(name: string, graph: Graph) {
    this.name = name;
    this.graph = graph;
  }

  receiveScout(sender: string, probeId: string, amount: number, debugInfo: { loop: string[] }): void {
    console.log('receiveScout', sender, probeId, amount, debugInfo);
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
      throw new Error(`expected one or two in events for probe ${probeId}`);
    }
    if (this.probes[probeId].out.length === 1) {
      // O or P loop, not backtracked
    } else if (this.probes[probeId].out.length > 1) {
        // O or P loop, after having backtracked
    } else {
      console.log(this.probes);
      throw new Error(`expected one or more out events for probe ${probeId}`);
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
  receiveNack(nackSender: string, debugInfo: { path: string[], backtracked: string[] }): void {
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
        this.sendProbeMessage(newStep, '1', { path: debugInfo.path, backtracked: [] });
      }
    } else {
      // console.log('backtracked', path.concat(this.name), [ nackSender ].concat(backtracked));
      const popped = debugInfo.path.pop();
      // console.log(`                     combining nack sender, internal receiveProbe`, popped, this.name, path, [nackSender].concat(backtracked));
      this.receiveProbe(popped, '1', { path: debugInfo.path, backtracked: [nackSender].concat(debugInfo.backtracked) });
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
       };
    }
  }
  receiveProbe(sender: string, probeId: string, debugInfo: { path: string[], backtracked: string[] }): void {
    this.ensureProbe(probeId);
    this.probes[probeId].in.push(sender);
    // console.log(`receiveProbe ${sender} => ${this.name}`, path);
    const loopFound = this.spliceLoop(sender, probeId, debugInfo.path);
    if (loopFound) {
      if (debugInfo.path.length >= 1) {
        // console.log('                   continuing by popping old sender from', path);
        const oldSender = debugInfo.path.pop();
        this.receiveProbe(oldSender, probeId, { path: debugInfo.path, backtracked: [] });
      }
      return;
    }
    // console.log('path after splicing', path);
    const nodes = this.getOutgoingLinks();
    if (nodes.length === 0) {
      // console.log(`                     combining self, sending nack ${this.name}->${sender}`, path, backtracked);
      this.sendNackMessage(sender, debugInfo);
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
    this.sendProbeMessage(newStep, '1', { path: debugInfo.path, backtracked: [] });
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
      const debugInfo: {
        path: string[],
        backtracked: string[]
      } = JSON.parse(parts[1]);
      return this.receiveNack(from, debugInfo);
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

    //   case 'propose':
    //     return this.receivePropose(from, parts[1], JSON.parse(parts[2]) as number);
    // case 'commit':
    //   return this.receiveCommit(from, parts[1], JSON.parse(parts[2]) as number);
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
    this.ensureProbe(probeId);
    this.probes[probeId].out.push(to);
    this.sendMessage(to, ['probe', probeId, JSON.stringify(debugInfo)]);
  }
  sendNackMessage(to: string, debugInfo: object): void {
    this.sendMessage(to, ['nack', JSON.stringify(debugInfo)]);
  }
  sendTransferMessage(to: string, weight: number): void {
    this.sendMessage(to, ['transfer', JSON.stringify(weight)]);
  }
  sendScoutMessage(to: string, probeId: string, amount: number, debugInfo: { loop: string[] }): void {
    this.sendMessage(to, ['scout', probeId, JSON.stringify(amount), JSON.stringify(debugInfo)]);
  }
  startProbe(probeId: string): boolean {
    const nodes = this.getOutgoingLinks();
    if (nodes.length === 0) {
      return false;
    }
    this.sendProbeMessage(nodes[0], probeId, { path: [], backtracked: [] });
    return true;
  }
}