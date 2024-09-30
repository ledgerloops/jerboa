import { Graph } from "./Graph.js";

export class Jerboa {
  private balance: {
    [to: string]: number;
  } = {};
  private graph: Graph;
  private name: string;
  constructor(name: string, graph: Graph) {
    this.name = name;
    this.graph = graph;
  }
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

  addTransfer(from: string, to: string, amount: number): number {
    const amountNetted = this.graph.addWeight(from, to, amount);
    this.graph.report(2, amountNetted);
    return amountNetted;
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
      this.addTransfer(loop[k+1], loop[k], smallestWeight);
    }
    // const after = this.graph.getTotalWeight();
    // console.log('total graph weight reduced by', before - after);
    this.graph.report(loop.length - 1, smallestWeight);
    return firstZeroPos;
  }
  receiveNack(nackSender: string, path: string[]): void {
    let newStep = this.name;
    // console.log('receiveNack removes link', newStep, nackSender);
    this.graph.removeLink(newStep, nackSender);
    if (path.length === 0) {
      // console.log('starting with a new worm');
      // no paths left, start with a new worm
      path = [];
      try {
        newStep = this.graph.getFirstNode(false);
      } catch (e) {
        if (e.message === 'Graph is empty') {
          // We're done!
          // console.log('done!');
          // console.log(`Done after ${counter} steps`);
          return;
        } else {
          throw e;
        }
      }
    }
    // console.log('receiveNack calls receiveProbe', newStep, path);
    this.receiveProbe(path);
  }

  receiveProbe(path: string[]): void {
    let newStep = this.name;
    // console.log('receiveProbe', newStep, path);
    path.push(newStep);
    // console.log('pushed', newStep, path);
    if (!this.graph.hasOutgoingLinks(newStep) && path.length > 0) {
      // console.log('backtracking', newStep, path);
      if (path.length < 2) {
        // this probe dies here
        // console.log('this probe dies here', this.name, path);
        return;
      } else {
        // backtrack
        const nackSender = path.pop();
        newStep = path.pop();
        
        const task = ['nack', newStep, nackSender, JSON.stringify(path)];
        // console.log('sending task string', task);
        this.graph.messaging.queueTask(task);
        return;
      }
    }
    // we now now that either newStep has outgoing links, or path is empty
    if (path.length === 0) {
      // console.log('starting with a new worm');
      // no paths left, start with a new worm
      // console.log('this probe done', this.name, path);
      return;
    } else {
      newStep = this.graph.getFirstNode(false, newStep);
      // console.log('considering', path, newStep);
    }
    // check for loops in path
    const pos = path.indexOf(newStep);
    if (pos !== -1) {
      const loop = path.splice(pos).concat(newStep);
      this.netLoop(loop);
      // console.log(`Found loop`, loop, ` pos ${pos} in `, path);
      newStep = this.graph.getFirstNode(false, path[path.length - 1]);
      // console.log(`Continuing with`, path, newStep);
    }
    const task = ['probe', newStep, JSON.stringify(path)];
    // console.log('sending task string', task);
    this.graph.messaging.queueTask(task);
  };

  ensureBalance(to: string): void {
    // console.log('ensuring balance', to, this.balance);
    if (typeof this.balance[to] === 'undefined') {
      this.balance[to] = 0;
    }
  }
  addWeight(to: string, weight: number): void {
    this.ensureBalance(to);
    this.balance[to] += weight;
  }
  getBalance(to: string): number | undefined {
    return this.balance[to];
  }
  // @returns number amount removed
  zeroOut(to: string): number {
    const amount = this.getBalance(to);
    delete this.balance[to];
    return amount;
  }
  getOutgoingLinks(): string[] {
    return Object.keys(this.balance);
  }
  getBalances(): { [to: string]: number } {
    return this.balance;
  }
}