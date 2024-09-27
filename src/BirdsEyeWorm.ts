import { Graph } from './Graph.js';

export class BirdsEyeWorm {
  graph: Graph = new Graph();
  stats: {
    [loopLength: number]: {
      numFound: number;
      totalAmount: number;
    }
  } = {};
  report(loopLength: number, amount: number): void {
    if (typeof this.stats[loopLength] === 'undefined') {
      this.stats[loopLength] = {
        numFound: 0,
        totalAmount: 0
      };
    }
    this.stats[loopLength].numFound++;
    this.stats[loopLength].totalAmount += amount;
  }
  addTransfer(from: string, to: string, amount: number): void {
    this.graph.addWeight(from, to, amount);
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
  // assumes all loop hops exist
  netLoop(loop: string[]): number {
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
    return firstZeroPos;
  }
  // removes dead ends as it finds them.
  // nets loops as it finds them.
  runWorm(): void {
    const path = [];
    let newStep = this.graph.getFirstNode();
    // eslint-disable-next-line no-constant-condition
    let counter = 0;
    while (counter++ < 100) {
      console.log('Step', path, newStep);
      path.push(newStep);
      console.log('picking first option from', newStep);
      newStep = this.graph.getFirstNode(newStep);
      console.log('considering', path, newStep);
      while (!this.graph.hasOutgoingLinks(newStep)) {
        // backtrack
        if (path.length === 0) {
          // no paths left
          return;
        }
        const previousStep = path.pop();
        console.log('backtracking', path, previousStep, newStep);
        console.log(`zeroOut`)
        this.graph.removeLink(previousStep, newStep);
        // after having removed the link previousStep -> newStep,
        // this will pick the next one in the outer loop:
        newStep = previousStep;
      }
      const pos = path.indexOf(newStep);
      if (pos !== -1) {
        const loop = path.splice(pos).concat(newStep);
        this.netLoop(loop);
        console.log(`Found loop`, loop, ` pos ${pos} in `, path);
        newStep = this.graph.getFirstNode(path[path.length - 1]);
        console.log(`Continuing with`, path, newStep);
      }
    }
  }
}