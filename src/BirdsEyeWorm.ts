export class BirdsEyeWorm {
  graph: {
    [from: string]: {
      [to: string]: number;
    }
  } = {};
  stats: {
    [loopLength: number]: {
      numFound: number;
      totalAmount: number;
    }
  } = {};
  ensureHop(from: string, to: string): void {
    if (typeof this.graph[from] === 'undefined') {
      this.graph[from] = {};
    }
    if (typeof this.graph[from][to] === 'undefined') {
      this.graph[from][to] = 0;
    }
  }
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
  // assumes that graph[from][to] exists
  zeroOut(from: string, to: string): void {
    // console.log(`zeroOut ${from} ${to} deleting link itself`);
    delete this.graph[from][to];
    if (this.graph[from].length === 0) {
      // console.log(`zeroOut ${from} ${to} deleting from node`);
      delete this.graph[from];
    }
  }
  // assumes that both graph[from][to] and graph[to][from] exist
  substractCounterBalance(from: string, to: string): void {
    const amount = this.graph[to][from];
    this.graph[from][to] -= amount;
    this.zeroOut(to, from);
    this.report(2, amount);
  }
  // assumes that graph[from][to] exists
  netBilateralAndRemove(from: string, to: string): void {
    console.log('bilateral netting', from, to);
    if (typeof this.graph[to] === 'undefined') {
      console.log('counter node is a leaf');
      return;
    }
    if (typeof this.graph[to][from] === 'undefined') {
      console.log('counter node has no back balance to ours');
      return;
    }
    if (this.graph[from][to] > this.graph[to][from]) {
      console.log('removing counter');
      this.substractCounterBalance(from, to);
    } else if (this.graph[from][to] < this.graph[to][from]) {
      console.log('removing ours');
      this.substractCounterBalance(to, from);
    } else { // mutual annihilation
      console.log('removing both');
      const amount = this.graph[from][to];
      this.zeroOut(from, to);
      this.zeroOut(to, from);
      this.report(2, amount);
    }
  }
  addTransfer(from: string, to: string, amount: number): void {
    console.log('addTransfer', from, to, amount);
    this.ensureHop(from, to);
    this.graph[from][to] += amount;
    this.netBilateralAndRemove(from, to);
    this.checkGraph();
  }
  checkGraph(): void {
    Object.keys(this.graph).forEach(from => {
      if (Object.keys(this.graph[from]).length === 0) {
        throw new Error(`node ${from} exists but has no paths out`);
      }
    });
  }
  // assumes all loop hops exist
  getSmallestWeight(loop: string[]): number {
    let smallestWeight = Infinity;
    for (let k = 0; k < loop.length - 1; k++) {
      const thisWeight = this.graph[loop[k]][loop[k+1]];
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
      if ((this.graph[loop[k]][loop[k+1]] === smallestWeight) && (typeof firstZeroPos === 'undefined')) {
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
    let newStep = Object.keys(this.graph)[0];
    // eslint-disable-next-line no-constant-condition
    let counter = 0;
    while (counter++ < 100) {
      console.log('Step', path, newStep);
      path.push(newStep);
      console.log('picking first option from', newStep, Object.keys(this.graph[newStep]));
      newStep = Object.keys(this.graph[newStep])[0];
      while (typeof this.graph[newStep] === 'undefined') {
        // backtrack
        if (path.length === 0) {
          // no paths left
          return;
        }
        const previousStep = path.pop();
        console.log('backtracking', path, previousStep, newStep);
        console.log(`zeroOut`)
        this.zeroOut(previousStep, newStep);
        // after having removed the link previousStep -> newStep,
        // this will pick the next one in the outer loop:
        newStep = previousStep;
      }
      const pos = path.indexOf(newStep);
      if (pos !== -1) {
        const loop = path.splice(pos).concat(newStep);
        this.netLoop(loop);
        console.log(`Found loop`, loop, ` pos ${pos} in `, path);
        newStep = Object.keys(this.graph[path[path.length - 1]])[0];
        console.log(`Continuing with`, path, newStep);
      }
    }
  }
}