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
  private nack: {
    [friend: string]: boolean
  } = {};
  constructor(name: string, graph: Graph) {
    this.name = name;
    this.graph = graph;
  }

  // assumes all loop hops exist
  getSmallestWeight(loop: string[]): number {
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
  netLoop(loop: string[]): number {
    const smallestWeight = this.getSmallestWeight(loop);
    if ((smallestWeight < MIN_LOOP_WEIGHT) || (smallestWeight > MAX_LOOP_WEIGHT)) {
      return 0;
    }
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
  // finishBilateralClear(sender: string, amount: number): void {
  //   this.balances.adjustBalance(sender, -amount);
  //   this.balances.adjustCounterBalance(sender, -amount);
  // }
  // receiveCommit(sender: string, probe: string, amount: number): void {
  //   if (probe === 'bilateral') {
  //     if (typeof this.sentBilateralClearing[sender] === 'undefined') { // role b
  //       this.sendMessage(sender, ['commit', 'bilateral', JSON.stringify(amount)]);
  //     } else {
  //       this.graph.report(2, amount);
  //       delete this.sentBilateralClearing[sender];
  //     }
  //     this.finishBilateralClear(sender, amount);
  //   }
  // }
  // receivePropose(sender: string, probe: string, amount: number): void {
  //   if (probe === 'bilateral') {
  //     if (typeof this.sentBilateralClearing[sender] === 'undefined') { // role b
  //       this.sendMessage(sender, ['propose', 'bilateral', JSON.stringify(amount)]);
  //     } else {
  //       this.sendMessage(sender, ['commit', 'bilateral', JSON.stringify(amount)]);
  //     }
  //   }
  // }
  // a -> b propose
  // b -> a propose
  // a -> b commit
  // b -> a commit
  // startBilateralClear(sender: string, amount: number): void {
  //   this.sentBilateralClearing[sender] = true;
  //   this.sendMessage(sender, ['propose', 'bilateral', JSON.stringify(amount)]);
  // }
  receiveTransfer(sender: string, amount: number): void {
    // console.log(`${sender}->${this.name}: ${amount}`);
    this.balances.adjustReceived(sender, amount);
  }
  receiveNack(nackSender: string, path: string[], backtracked: string[]): void {
    this.nack[nackSender] = true;
    if (path.length === 0) {
      const nodes = this.getOutgoingLinks();
      if (nodes.length === 0) {
        console.log('finished   ', [], [this.name, nackSender].concat(backtracked));
      } else {
        console.log('backtracked', [ this.name ], [nackSender].concat(backtracked));
        const newStep = randomStringFromArray(nodes);
        const task = ['probe', JSON.stringify(path), JSON.stringify([])];
        this.graph.messaging.sendMessage(this.name, newStep, task);
      }
    } else {
      // console.log('backtracked', path.concat(this.name), [ nackSender ].concat(backtracked));
      const popped = path.pop();
      // console.log(`                     combining nack sender, internal receiveProbe`, popped, this.name, path, [nackSender].concat(backtracked));
      this.receiveProbe(popped, path, [nackSender].concat(backtracked));
    }
  }
  spliceLoop(sender: string, path: string[]): boolean {
    // chop off loop if there is one:
    const pos = path.indexOf(this.name);
    if (pos !== -1) {
      const loop = path.splice(pos).concat([sender, this.name]);
      this.netLoop(loop);
      // console.log(`Found loop`, loop, ` pos ${pos}`);
      console.log(`found loop `, path, loop);
      return true;
    }
    return false;
  }
  receiveProbe(sender: string, path: string[], backtracked: string[]): void {
    // console.log(`receiveProbe ${sender} => ${this.name}`, path);
    const loopFound = this.spliceLoop(sender, path);
    if (loopFound) {
      if (path.length >= 1) {
        // console.log('                   continuing by popping old sender from', path);
        const oldSender = path.pop();
        this.receiveProbe(oldSender, path, []);
      }
      return;
    }
    // console.log('path after splicing', path);
    const nodes = this.getOutgoingLinks();
    if (nodes.length === 0) {
      // console.log(`                     combining self, sending nack ${this.name}->${sender}`, path, backtracked);
      const task = ['nack', JSON.stringify(path), JSON.stringify(backtracked)];
      // console.log('backtracking', this.name, sender, task);
      this.graph.messaging.sendMessage(this.name, sender, task);
      return;
    } else if (backtracked.length > 0) {
      console.log(`backtracked`, path.concat([sender, this.name]), backtracked);
    }
    // console.log('         did we print?', sender, this.name, path, backtracked);
    path.push(sender);
    const newStep = randomStringFromArray(nodes);
    // console.log(`forwarding from ${this.name} to ${newStep} (balance ${this.balances.getBalance(newStep)})`);
    const task = ['probe', JSON.stringify(path), JSON.stringify([])];
    // console.log('sending task string', task);
    this.graph.messaging.sendMessage(this.name, newStep, task);
  };
  receiveMessage(from: string, parts: string[]): void {
    // console.log('receiveMessage', from, this.name, parts);
    switch(parts[0]) {
      case 'probe':
        return this.receiveProbe(from, JSON.parse(parts[1]) as string[], JSON.parse(parts[2]) as string[]);
    case 'nack':
      return this.receiveNack(from, JSON.parse(parts[1]) as string[], JSON.parse(parts[2]) as string[]);
    case 'transfer':
      return this.receiveTransfer(from, JSON.parse(parts[1]) as number);
    //   case 'propose':
    //     return this.receivePropose(from, parts[1], JSON.parse(parts[2]) as number);
    // case 'commit':
    //   return this.receiveCommit(from, parts[1], JSON.parse(parts[2]) as number);
    default:
      throw new Error('unknown task');
    }
  }
  addWeight(to: string, weight: number): void {
    this.balances.adjustSent(to, weight);

    this.graph.messaging.sendMessage(this.name, to, ['transfer', JSON.stringify(weight)]);
  }
  getOutgoingLinks(): string[] {
    const balances = this.balances.getBalances();
    return Object.keys(balances).filter((to: string) => {
      if (this.nack[to]) {
        return false;
      }
      return (balances[to] > MIN_LOOP_WEIGHT);
    });
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
  startProbe(): boolean {
    const nodes = this.getOutgoingLinks();
    if (nodes.length === 0) {
      return false;
    }
    this.sendMessage(nodes[0], ['probe', JSON.stringify([]), JSON.stringify([])]);
    return true;
  }
}