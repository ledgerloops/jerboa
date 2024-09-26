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
  getBilaterallyNetted(from: string, to: string): number {
    const [lower, higher, sign] = (from < to ? [from, to, 1] : [to, from, -1]);
    if (typeof this.matrix[lower] === 'undefined') {
      return 0;
    }
    if (typeof this.matrix[lower][higher] === 'undefined') {
      return 0;
    }
    return sign * this.matrix[lower][higher].bilaterallyNetted;
  }
  ensureCell(lower: string, higher: string): void {
    if (typeof this.matrix[lower] === 'undefined') {
      this.matrix[lower] = {};
    }
    if (typeof this.matrix[lower][higher] === 'undefined') {
      this.matrix[lower][higher] = { forward: [], backward: [], bilaterallyNetted: 0 };
    }
  }
  addLink(linkFrom: string, linkTo: string, weight:  number): number {
    if (linkFrom < linkTo) {
      this.ensureCell(linkFrom, linkTo);
      this.matrix[linkFrom][linkTo].forward.push(weight);
      this.matrix[linkFrom][linkTo].bilaterallyNetted += weight;
      return this.matrix[linkFrom][linkTo].bilaterallyNetted;
    } else if (linkFrom === linkTo) {
      return 0;
    } else {
      this.ensureCell(linkTo, linkFrom);
      this.matrix[linkTo][linkFrom].backward.push(weight);
      this.matrix[linkTo][linkFrom].bilaterallyNetted -= weight;
      return this.matrix[linkTo][linkFrom].bilaterallyNetted;
    }
  }
  removeLeaves(): number {
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
  netTriangles(): number {
    let totalNetted = 0;
    const hops: {
      [from: string]: string[];
    } = {};
    const loops: string[][] = [];
    Object.keys(this.matrix).forEach(lower => {
      if (Object.keys(this.matrix[lower]).length === 0) {
        throw new Error('how can this matrix row exist but be empty?');
      }
      Object.keys(this.matrix[lower]).forEach(higher => {
        if (this.matrix[lower][higher].bilaterallyNetted > 0) {
          if (typeof hops[lower] === 'undefined') {
            hops[lower] = [];
          }
          hops[lower].push(higher);
        } else if (this.matrix[lower][higher].bilaterallyNetted < 0) {
          if (typeof hops[higher] === 'undefined') {
            hops[higher] = [];
          }
          hops[higher].push(lower);
        }
      });
    });
    // permutations of three nodes and symmetries between them
    // 1 2 3 -> canonical upward
    // 1 3 2 -> canonical downward
    // 2 1 3 -> downward
    // 2 3 1 -> upward
    // 3 1 2 -> upward
    // 3 2 1 -> upward
    // from to next -> to >= from, next >= from
    Object.keys(hops).forEach(from => {
      hops[from].forEach(to => {
        if (to < from) {
          //not canonical
          return;
        }
        if (this.getBilaterallyNetted(from, to) <= 0) {
          // not really a hop
          return;
        }
        if (typeof hops[to] === 'undefined') {
          throw new Error('Why does this first hop lead to a leaf?');
        }
        hops[to].forEach(next => {
          if (next < from) {
            //not canonical
            return;
          }
          if (this.getBilaterallyNetted(to, next) <= 0) {
            // not really a hop
            return;
          }  
          if (typeof hops[next] === 'undefined') {
            throw new Error('Why does this second hop lead to a leaf?');
          }
          if (hops[next].indexOf(from) !== -1) {
            if (this.getBilaterallyNetted(next, from) <= 0) {
              // not really a hop
              return;
            }    
            const weight = [
              this.getBilaterallyNetted(from, to),
              this.getBilaterallyNetted(to, next),
              this.getBilaterallyNetted(next, from)
            ];
            let smallestWeight = (weight[0] < weight[1] ? weight[0] : weight[1]);
            if (weight[2] < smallestWeight) {
              smallestWeight = weight[2];
            }
            const newBalances = [
              this.addLink(from, next, smallestWeight),
              this.addLink(next, to, smallestWeight),
              this.addLink(to, from, smallestWeight),
            ];
            console.log(weight, newBalances, newBalances.map(x => (x ===0)));
            // canonical triangular loop found and removed
            loops.push([from, to, next, smallestWeight.toString()]);
            totalNetted += 3*smallestWeight;
          }
        })
      });
    });
    console.log(`Netted ${totalNetted / 1000000} million in ${loops.length} triangles`);
    return totalNetted;
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