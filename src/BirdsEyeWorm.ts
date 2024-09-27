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
    delete this.graph[from][to];
    if (this.graph[from].length === 0) {
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
    if (typeof this.graph[to] === 'undefined') {
      return;
    }
    if (typeof this.graph[to][from] === 'undefined') {
      return;
    }
    if (this.graph[from][to] > this.graph[to][from]) {
      this.substractCounterBalance(from, to);
    } else if (this.graph[from][to] < this.graph[to][from]) {
      this.substractCounterBalance(to, from);
    } else { // mutual annihilation
      const amount = this.graph[from][to];
      this.zeroOut(from, to);
      this.zeroOut(to, from);
      this.report(2, amount);
    }
  }
  addTransfer(from: string, to: string, amount: number): void {
    this.ensureHop(from, to);
    this.graph[from][to] += amount;
    this.netBilateralAndRemove(from, to);
  }
  // removes dead ends as it finds them.
  // nets loops as it finds them.
  runWorm(): void {
    const path = [];
    let newStep = Object.keys(this.graph)[0];
    do {
      path.push(newStep);
      newStep = Object.keys(this.graph[newStep])[0];
      while (typeof this.graph[newStep] === 'undefined') {
        // backtrack
        if (path.length === 0) {
          // no paths left
          return;
        }
        const previousStep = path.pop();
        console.log('backtracking', path, previousStep, newStep);
        this.zeroOut(previousStep, newStep);
        // after having removed the link previousStep -> newStep,
        // this will pick the next one in the outer loop:
        newStep = previousStep;
      }
    } while (path.indexOf(newStep) === -1);
    console.log(path);
  }
}