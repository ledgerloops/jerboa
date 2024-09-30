import { Graph } from "./Graph.js";
import { Balances } from "./Balances.js";
export class Jerboa {
  private balances: Balances = new Balances();
  private graph: Graph;
  private name: string;
  constructor(name: string, graph: Graph) {
    this.name = name;
    this.graph = graph;
  }
  private sentBilateralClearing: { [otherParty: string]: boolean } = {};

  // assumes all loop hops exist
  getSmallestWeight(loop: string[]): number {
    let smallestWeight = Infinity;
    for (let k = 0; k < loop.length - 1; k++) {
      const thisWeight = this.graph.getWeight(loop[k], loop[k+1]);
      // console.log(`Weight on loop from ${loop[k]} to ${loop[k+1]} is ${thisWeight}`);
      if (thisWeight < smallestWeight) {
        smallestWeight = thisWeight;
      }
    }
    return smallestWeight;
  }

  // assumes all loop hops exist
  netLoop(loop: string[]): number {
    // const before = this.graph.getTotalWeight();
    const smallestWeight = this.getSmallestWeight(loop);
    if (smallestWeight === 0) {
      return 0;
    }
    let firstZeroPos;
    for (let k = 0; k < loop.length - 1; k++) {
      if ((this.graph.getWeight(loop[k], loop[k+1]) === smallestWeight) && (typeof firstZeroPos === 'undefined')) {
        firstZeroPos = k;
      }
      this.graph.addWeight(loop[k+1], loop[k], smallestWeight);
    }
    // const after = this.graph.getTotalWeight();
    // console.log('total graph weight reduced by', before - after);
    this.graph.report(loop.length - 1, smallestWeight);
    return firstZeroPos;
  }
  sendMessage(to: string, task: string[]): void {
    this.graph.messaging.sendMessage(this.name, to, task);
  }
  finishBilateralClear(sender: string, amount: number): void {
    this.balances.adjustBalance(sender, -amount);
    this.balances.adjustCounterBalance(sender, -amount);
  }
  receiveCommit(sender: string, probe: string, amount: number): void {
    if (probe === 'bilateral') {
      if (typeof this.sentBilateralClearing[sender] === 'undefined') { // role b
        this.sendMessage(sender, ['commit', 'bilateral', JSON.stringify(amount)]);
      } else {
        this.graph.report(2, amount);
        delete this.sentBilateralClearing[sender];
      }
      this.finishBilateralClear(sender, amount);
    }
  }
  receivePropose(sender: string, probe: string, amount: number): void {
    if (probe === 'bilateral') {
      if (typeof this.sentBilateralClearing[sender] === 'undefined') { // role b
        this.sendMessage(sender, ['propose', 'bilateral', JSON.stringify(amount)]);
      } else {
        this.sendMessage(sender, ['commit', 'bilateral', JSON.stringify(amount)]);
      }
    }
  }
  // a -> b propose
  // b -> a propose
  // a -> b commit
  // b -> a commit
  startBilateralClear(sender: string, amount: number): void {
    this.sentBilateralClearing[sender] = true;
    this.sendMessage(sender, ['propose', 'bilateral', JSON.stringify(amount)]);
  }
  receiveTransfer(sender: string, amount: number): void {
    // console.log('processing transfer message,', sender, this.name, amount);
    this.balances.adjustCounterBalance(sender, amount);
    const balance = this.balances.getBalance(sender);
    const counterBalance = this.balances.getCounterBalance(sender);
    if (counterBalance <= balance) {
      this.startBilateralClear(sender, counterBalance);
    }
  }
  receiveNack(nackSender: string, path: string[]): void {
    // console.log('receiveNack removes link', newStep, nackSender);
    this.graph.removeLink(this.name, nackSender);
    if (path.length === 0) {
      // this probe is done
      return;
    }
    const popped = path.pop();
    // console.log('receiveNack calls receiveProbe', newStep, path);
    this.receiveProbe(popped, path);
  }
  spliceLoop(path: string[]): void {
    // chop off loop if there is one:
    const pos = path.indexOf(this.name);
    if (pos !== -1) {
      const loop = path.splice(pos).concat(this.name);
      this.netLoop(loop);
      console.log(`Found loop`, loop, ` pos ${pos} in `, path);
      console.log(`Continuing with`, path);
    }
  }
  receiveProbe(sender: string, path: string[]): void {
    console.log('receiveProbe', this.name, path);
    this.spliceLoop(path);
    const nodes = this.balances.getOutgoingLinks();
    if (nodes.length === 0) {
      const task = ['nack', JSON.stringify(path)];
      console.log('backtracking', task);
      this.graph.messaging.sendMessage(this.name, sender, task);
      return;
    }
    path.push(sender);
    const newStep = nodes[0];
    console.log('considering', path, newStep, this.balances.getBalance(newStep));
    const task = ['probe', JSON.stringify(path)];
    console.log('sending task string', task);
    this.graph.messaging.sendMessage(this.name, newStep, task);
  };
  receiveMessage(from: string, parts: string[]): void {
    switch(parts[0]) {
      case 'probe':
        return this.receiveProbe(from, JSON.parse(parts[1]) as string[]);
    case 'nack':
      return this.receiveNack(from, JSON.parse(parts[1]) as string[]);
    case 'transfer':
      return this.receiveTransfer(from, JSON.parse(parts[1]) as number);
      case 'propose':
        return this.receivePropose(from, parts[1], JSON.parse(parts[2]) as number);
    case 'commit':
      return this.receiveCommit(from, parts[1], JSON.parse(parts[2]) as number);      
    default:
      throw new Error('unknown task');
    }
  }
  addWeight(to: string, weight: number): void {
    this.balances.adjustBalance(to, weight);
    // console.log('sending transfer message', this.name, to, weight);
    this.graph.messaging.sendMessage(this.name, to, ['transfer', JSON.stringify(weight)]);
    const balance = this.balances.getBalance(to);
    const counterBalance = this.balances.getCounterBalance(to);
    if (counterBalance < balance) {
      this.startBilateralClear(to, counterBalance);
    }
  }
  getBalance(to: string): number | undefined {
    return this.balances.getBalance(to);
  }
  getCounterBalance(to: string): number | undefined {
    return this.balances.getCounterBalance(to);
  }

  // @returns number amount removed
  zeroOut(to: string): number {
    return this.balances.zeroOut(to);
  }
  getOutgoingLinks(): string[] {
    return this.balances.getOutgoingLinks();
  }

  getBalances(): { [to: string]: number } {
    return this.balances.getBalances();
  }
  clearZeroes(): void {
    this.balances.sanityCheck(this.name);
  }
  startProbe(): boolean {
    const nodes = this.balances.getOutgoingLinks();
    if (nodes.length === 0) {
      return false;
    }
    this.sendMessage(nodes[0], ['probe', JSON.stringify([])]);
    return true;
  }
}