export class ConnectivityMatrix {
  matrix: {
    [lower: string]: {
      [higher: string]: {
        forward: number[],
        backward: number[],
      }
    }
  } = {};
  ensureCell(lower: string, higher: string): void {
    if (typeof this.matrix[lower] === 'undefined') {
      this.matrix[lower] = {};
    }
    if (typeof this.matrix[lower][higher] === 'undefined') {
      this.matrix[lower][higher] = { forward: [], backward: [] };
    }
  }
  addLink(linkFrom: string, linkTo: string, weight:  number): void {
    if (linkFrom < linkTo) {
      this.ensureCell(linkFrom, linkTo);
      this.matrix[linkFrom][linkTo].forward.push(weight);
    } else if (linkFrom === linkTo) {
      // ...
    } else {
      this.ensureCell(linkTo, linkFrom);
      this.matrix[linkTo][linkFrom].backward.push(weight);
    }
  }
  print(): void {
    let total = 0;
    let bilateral = 0;
    Object.keys(this.matrix).forEach(lower => {
      Object.keys(this.matrix[lower]).forEach(higher => {
        // console.log(`${lower}: ${this.matrix[lower][higher].forward.join(' ')} - ${this.matrix[lower][higher].backward.join(' ')} :${higher}`);
        const forward = this.matrix[lower][higher].forward.reduce((partialSum, a) => partialSum + a, 0);
        const backward = this.matrix[lower][higher].backward.reduce((partialSum, a) => partialSum + a, 0);
        total += forward + backward;
        bilateral += Math.min(forward, backward);
      });
    });
    console.log(`Total (millions): ${total / 1000000}, of which bilaterally nettable: ${Math.round((bilateral / total)*100)}%`);
  }
}