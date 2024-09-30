import { Graph } from './Graph.js';

const MAX_NUM_STEPS = 1000000;

export class DLD {
  graph: Graph = new Graph();
  stats: {
    [loopLength: number]: {
      numFound: number;
      totalAmount: number;
    }
  } = {};
  report(loopLength: number, amount: number): void {
    // if (loopLength > 2) {
    //   console.log('report', loopLength, amount);
    // }
    if (typeof this.stats[loopLength] === 'undefined') {
      this.stats[loopLength] = {
        numFound: 0,
        totalAmount: 0
      };
    }
    this.stats[loopLength].numFound++;
    this.stats[loopLength].totalAmount += amount;
  }
  addTransfer(from: string, to: string, amount: number): number {
    const amountNetted = this.graph.addWeight(from, to, amount);
    this.report(2, amountNetted);
    return amountNetted;
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
    this.report(loop.length - 1, smallestWeight);
    return firstZeroPos;
  }
  // removes dead ends as it finds them.
  // nets loops as it finds them.
  runWorm(): void {
    let path = [];
    let newStep = this.graph.getFirstNode();
    // eslint-disable-next-line no-constant-condition
    let counter = 0;
    while (counter++ < MAX_NUM_STEPS) {
      // console.log('Step', path, newStep);
      path.push(newStep);
      // console.log('picking first option from', newStep);
      while (!this.graph.hasOutgoingLinks(newStep) && path.length > 0) {
        // backtrack
        const previousStep = path.pop();
        // console.log('backtracking', path, previousStep, newStep);
        // console.log(`zeroOut`)
        this.graph.removeLink(previousStep, newStep);
        // after having removed the link previousStep -> newStep,
        // this will pick the next one in the outer loop:
        newStep = previousStep;
      }
      // we now now that either newStep has outgoing links, or path is empty
      if (path.length === 0) {
        // no paths left, start with a new worm
        path = [];
        try {
          newStep = this.graph.getFirstNode();
        } catch (e) {
          if (e.message === 'Graph is empty') {
            // We're done!
            // console.log(`Done after ${counter} steps`);
            return;
          } else {
            throw e;
          }
        }
      } else {
        newStep = this.graph.getFirstNode(newStep);
        // console.log('considering', path, newStep);  
      }
      // check for loops in path
      const pos = path.indexOf(newStep);
      if (pos !== -1) {
        const loop = path.splice(pos).concat(newStep);
        this.netLoop(loop);
        // console.log(`Found loop`, loop, ` pos ${pos} in `, path);
        newStep = this.graph.getFirstNode(path[path.length - 1]);
        // console.log(`Continuing with`, path, newStep);
      }
    }
  }
}