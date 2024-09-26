export class ConnectivityMatrix {
  matrix: {
    [lower: string]: {
      [higher: string]: {
        forward: number[],
        backward: number[],
        bilaterallyNetted,
      }
    }
  } = {};
  ensureCell(lower: string, higher: string): void {
    if (typeof this.matrix[lower] === 'undefined') {
      this.matrix[lower] = {};
    }
    if (typeof this.matrix[lower][higher] === 'undefined') {
      this.matrix[lower][higher] = { forward: [], backward: [], bilaterallyNetted: 0 };
    }
  }
  addLink(linkFrom: string, linkTo: string, weight:  number): void {
    if (linkFrom < linkTo) {
      this.ensureCell(linkFrom, linkTo);
      this.matrix[linkFrom][linkTo].forward.push(weight);
      this.matrix[linkFrom][linkTo].bilaterallyNetted += weight;
    } else if (linkFrom === linkTo) {
      // ...
    } else {
      this.ensureCell(linkTo, linkFrom);
      this.matrix[linkTo][linkFrom].backward.push(weight);
      this.matrix[linkTo][linkFrom].bilaterallyNetted -= weight;
    }
  }
  removeLeaves(): number {
    console.log(this.matrix[1274]);
    const numNonZeroBalances: {
      [nodeNo: string]: {
        outgoing: number,
        incoming: number,
      }
    } = {};
    Object.keys(this.matrix).forEach(lower => {
      if (Object.keys(this.matrix[lower]).length === 0) {
        throw new Error('how can this matrix row exist but be empty?');
      }
      Object.keys(this.matrix[lower]).forEach(higher => {
        if (typeof numNonZeroBalances[lower] === 'undefined') {
          // console.log('creating', lower);
          numNonZeroBalances[lower] = { outgoing: 0, incoming: 0 };
        }
        if (typeof numNonZeroBalances[higher] === 'undefined') {
          // console.log('creating', higher);
          numNonZeroBalances[higher] = { outgoing: 0, incoming: 0 };
        }
        if (this.matrix[lower][higher].bilaterallyNetted > 0) {
          numNonZeroBalances[lower].outgoing++;
          numNonZeroBalances[higher].incoming++;
        } else if (this.matrix[lower][higher].bilaterallyNetted < 0) {
          numNonZeroBalances[higher].outgoing++;
          numNonZeroBalances[lower].incoming++;
        }
      });
    });
    let hermits = 0;
    let sources = 0;
    let internals = 0;
    let drains = 0;
    Object.keys(numNonZeroBalances).forEach(nodeNo => {
      if (numNonZeroBalances[nodeNo].outgoing === 0) {
        if (numNonZeroBalances[nodeNo].incoming === 0) {
          hermits++;
        } else {
          drains++;
        }
      } else {
        if (numNonZeroBalances[nodeNo].incoming === 0) {
          sources++;
        } else {
          internals++;
        }
      } 
    });
    let linksRemoved = 0;
    Object.keys(this.matrix).forEach(lower => {
      // console.log(lower);
      if ((numNonZeroBalances[lower].incoming === 0) || (numNonZeroBalances[lower].outgoing === 0)) {
        linksRemoved += Object.keys(this.matrix[lower]).length;
        delete this.matrix[lower];
      }
    });
    Object.keys(this.matrix).forEach(lower => {
      Object.keys(this.matrix[lower]).forEach(higher => {
        if ((numNonZeroBalances[higher].incoming === 0) || (numNonZeroBalances[higher].outgoing === 0)) {
          linksRemoved++;
          delete this.matrix[lower][higher];
          if (Object.keys(this.matrix[lower]).length === 0) {
            delete this.matrix[lower];
          }
        }
      });
    });
    console.log({ hermits, sources, internals, drains, linksRemoved });
    return linksRemoved;
  }
  print(): void {
    let total = 0;
    let bilateral = 0;
    let check = 0;
    let numTrans = 0;
    Object.keys(this.matrix).forEach(lower => {
      Object.keys(this.matrix[lower]).forEach(higher => {
        // console.log(`${lower}: ${this.matrix[lower][higher].forward.join(' ')} (${this.matrix[lower][higher].bilaterallyNetted}) ${this.matrix[lower][higher].backward.join(' ')} :${higher}`);
        const forward = this.matrix[lower][higher].forward.reduce((partialSum, a) => partialSum + a, 0);
        const backward = this.matrix[lower][higher].backward.reduce((partialSum, a) => partialSum + a, 0);
        total += forward + backward;
        bilateral += Math.min(forward, backward);
        check += Math.abs(this.matrix[lower][higher].bilaterallyNetted);
        numTrans += this.matrix[lower][higher].forward.length + this.matrix[lower][higher].backward.length;
      });
    });
    console.log(`Checking that ${check} + 2*${bilateral} = ${check+2*bilateral} equals ${total}`);
    console.log(`Total (millions): ${total / 1000000} in ${numTrans} transactions, of which bilaterally nettable: ${Math.round((bilateral / total)*100)}%`);
  }
}