import { Graph } from './BirdsEyeGraph.js';
import { writeFile, appendFile } from 'node:fs/promises';

const MAX_NUM_STEPS = 1000000;

export function printLine(preface: string, first: string[], second: string[]): void {
  const firstStr = first.length > 0 ? `[ ${first.map(x => `'${x}'`).join(', ')} ]` : `[]`;
  const secondStr = second.length > 0 ? `[ ${second.map(x => `'${x}'`).join(', ')} ]` : `[]`;
  console.log(`${preface} ${firstStr} ${secondStr}`);
}

export class BirdsEyeWorm {
  graph: Graph = new Graph();
  stats: {
    [loopLength: number]: {
      numFound: number;
      totalAmount: number;
    }
  } = {};
  private probingReport: boolean;
  private solutionFile: string;
  constructor(probingReport: boolean, solutionFile?: string) {
    this.probingReport = probingReport;
    this.solutionFile = solutionFile;
  }
  printLine(preface: string, first: string[], second: string[]): void {
    if (this.probingReport) {
      printLine(preface, first, second);
    }
  }
  report(loopLength: number, amount: number): void {
    // if (loopLength > 2) {
      // console.log('report', loopLength, amount);
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
    if (amountNetted > 0) {
      // console.log(from, to, amount, amountNetted);
      this.report(2, amountNetted);
    }
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
    return Math.round(smallestWeight * 1000) / 1000;
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
    return smallestWeight;
  }
  // removes dead ends as it finds them.
  // nets loops as it finds them.
  async runWorm(): Promise<void> {
    let path = [];
    let newStep = this.graph.getFirstNode();
    if (this.solutionFile) {
      await writeFile(this.solutionFile, '');
    }

    // eslint-disable-next-line no-constant-condition
    let counter = 0;
    while (counter++ < MAX_NUM_STEPS) {
      // console.log('Step', path, newStep);
      path.push(newStep);
      // console.log('picking first option from', newStep);
      // console.log(path);
      const backtracked = [];
      while (path.length > 0 && !this.graph.hasOutgoingLinks(path[path.length - 1])) {
        // console.log('no outgoing links', path);
        // backtrack
        const previousStep = path.pop();
        backtracked.push(previousStep);
        if (path.length > 0) {
          this.graph.removeLink(path[path.length - 1], previousStep);
        }
      }
      // we now now that either newStep has outgoing links, or path is empty
      if (path.length === 0) {
        if (backtracked.length > 0) {
          this.printLine('finished   ', path, backtracked.reverse());
        }
        // no paths left, start with a new worm
        path = [];
        try {
          newStep = this.graph.getFirstNode();
        } catch (e) {
          if (e.message === 'Graph is empty') {
            // We're done!
            console.log(`Done after ${counter} steps`);
            return;
          } else {
            throw e;
          }
        }
      } else {
        if (backtracked.length > 0) {
          this.printLine('backtracked', path, backtracked.reverse());
          newStep = path[path.length - 1];
          // console.log('continuing from', path, newStep);
        }

        newStep = this.graph.getFirstNode(newStep);
        // console.log('considering', path, newStep); 
      }
      // check for loops in path
      const pos = path.indexOf(newStep);
      if (pos !== -1) {
        const loop = path.splice(pos).concat(newStep);
        const smallestWeight = this.netLoop(loop);
        this.printLine(`found loop `, path, loop);
        if (this.solutionFile) {
          await appendFile(this.solutionFile, loop.concat(smallestWeight).join(' ') + '\n');
        }

        newStep = this.graph.getFirstNode(path[path.length - 1]);
        // console.log(`Continuing with`, path, newStep);
      }
    }
  }
}
