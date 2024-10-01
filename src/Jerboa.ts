import { Graph } from "./Graph.js";
import { Balances } from "./Balances.js";
const MIN_LOOP_WEIGHT = 0.00000001;
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
      in?: string,
      out?: string,
      traces: {
        [traceId: string]: {
          in?: string,
          out?: string,
          mintedHere: boolean,
        }
      }
    }
  }
  constructor(name: string, graph: Graph) {
    this.name = name;
    this.graph = graph;
  }
  sendMessage(to: string, task: string[]): void {
    this.graph.messaging.sendMessage(this.name, to, task);
  }
  receiveTransfer(sender: string, amount: number): void {
    // console.log(`${sender}->${this.name}: ${amount}`);
    this.balances.adjustReceived(sender, amount);
    this.checkFriendCache(sender);
  }
  receiveNack(nackSender: string, probeId: string): void {
    delete this.outgoingLinks[nackSender];
    const nodes = this.getOutgoingLinks();
    if (nodes.length === 0) {
      this.sendNackMessage(this.probes[probeId].in, probeId);
    }
  }
  spliceLoop(sender: string, path: string[]): boolean {
    // chop off loop if there is one:
    const pos = path.indexOf(this.name);
    if (pos !== -1) {
      const loop = path.splice(pos).concat([sender, this.name]);
      // this.netLoop(loop);
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
      this.probes[probeId] = { traces: {} };
    }
  }
  receiveProbe(sender: string, probeId: string): void {
    this.ensureProbe(probeId);
    const loopFound: boolean = (typeof this.probes[probeId].in !== 'undefined');
    this.probes[probeId].in = sender;
    if (loopFound) {
      const traceId = '2';
      this.sendTraceMessage(sender, probeId, traceId);
    }
    const nodes = this.getOutgoingLinks();
    if (nodes.length === 0) {
      this.sendNackMessage(sender, probeId);
      return;
    }
    const newStep = randomStringFromArray(nodes);
    this.sendProbeMessage(newStep, '1');
  };
  receiveMessage(from: string, parts: string[]): void {
    // console.log('receiveMessage', from, this.name, parts);
    switch(parts[0]) {
      case 'probe': {
        const probeId = parts[1];
        return this.receiveProbe(from, probeId);
      }
    case 'nack': {
      const probeId = parts[1];
      return this.receiveNack(from, probeId);
    }
    case 'transfer': {
      return this.receiveTransfer(from, JSON.parse(parts[1]) as number);
    //   case 'propose':
    //     return this.receivePropose(from, parts[1], JSON.parse(parts[2]) as number);
    // case 'commit':
    //   return this.receiveCommit(from, parts[1], JSON.parse(parts[2]) as number);
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
  sendTraceMessage(to: string, probeId: string, traceId: string): void {
    this.sendMessage(to, ['trace', probeId, traceId]);
  }
  sendProbeMessage(to: string, probeId: string): void {
    this.ensureProbe(probeId);
    if (typeof this.probes[probeId].out !== 'undefined') {
      throw new Error('unexpectedly forking probe');
    }
    this.probes[probeId].out = to;
    this.sendMessage(to, ['probe', probeId]);
  }
  sendNackMessage(to: string, probeId: string): void {
    this.sendMessage(to, ['nack', probeId]);
  }
  sendTransferMessage(to: string, weight: number): void {
    this.sendMessage(to, ['transfer', JSON.stringify(weight)]);
  }
  startProbe(): boolean {
    const nodes = this.getOutgoingLinks();
    if (nodes.length === 0) {
      return false;
    }
    this.sendProbeMessage(nodes[0], '1');
    return true;
  }
}