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
    Object.keys(hops).forEach(one => {
      hops[one].forEach(two => {
        if (two < one) {
          //not canonical
          return;
        }
        if (this.getBilaterallyNetted(one, two) <= 0) {
          // not really a hop
          return;
        }
        if (typeof hops[two] === 'undefined') {
          throw new Error('Why does this first hop lead to a leaf?');
        }
        hops[two].forEach(three => {
          if (three < one) {
            //not canonical
            return;
          }
          if (this.getBilaterallyNetted(two, three) <= 0) {
            // not really a hop
            return;
          }  
          if (typeof hops[three] === 'undefined') {
            throw new Error('Why does this second hop lead to a leaf?');
          }
          if (hops[three].indexOf(one) !== -1) {
            if (this.getBilaterallyNetted(three, one) <= 0) {
              // not really a hop
              return;
            }    
            const weight = [
              this.getBilaterallyNetted(one, two),
              this.getBilaterallyNetted(two, three),
              this.getBilaterallyNetted(three, one)
            ];
            let smallestWeight = (weight[0] < weight[1] ? weight[0] : weight[1]);
            if (weight[2] < smallestWeight) {
              smallestWeight = weight[2];
            }
            // const newBalances = [
            this.addLink(one, three, smallestWeight);
            this.addLink(three, two, smallestWeight);
            this.addLink(two, one, smallestWeight);
            // ];
            // console.log(weight, newBalances, newBalances.map(x => (x ===0)));
            // canonical triangular loop found and removed
            loops.push([one, two, three, smallestWeight.toString()]);
            totalNetted += 3*smallestWeight;
          }
        })
      });
    });
    console.log(`Netted ${totalNetted / 1000000} million in ${loops.length} triangles`);
    return totalNetted;
  }
  netSquares(): number {
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
    // 1 2 3 4 -> canonical upward
    // 1 3 2 4 -> 
    // 2 1 3 4 -> 
    // 2 3 1 4 -> 
    // 3 1 2 4 -> 
    // 3 2 1 4 -> downward
    // 1 2 4 3 -> 
    // 1 3 4 2 -> 
    // 2 1 4 3 -> downward
    // 2 3 4 1 -> upward
    // 3 1 4 2 -> 
    // 3 2 4 1 -> 
    // 1 4 2 3 -> 
    // 1 4 3 2 -> canonical downward
    // 2 4 1 3 -> 
    // 2 4 3 1 -> 
    // 3 4 1 2 -> upward
    // 3 4 2 1 -> 
    // 4 1 2 3 -> upward
    // 4 1 3 2 -> 
    // 4 2 1 3 -> 
    // 4 2 3 1 -> 
    // 4 3 1 2 -> 
    // 4 3 2 1 -> downward
    // one two three four -> two >= one, three >= one, four >= one
    Object.keys(hops).forEach(one => {
      hops[one].forEach(two => {
        if (two < one) {
          //not canonical
          return;
        }
        if (this.getBilaterallyNetted(one, two) <= 0) {
          // not really a hop
          return;
        }
        if (typeof hops[two] === 'undefined') {
          throw new Error('Why does this first hop lead to a leaf?');
        }
        hops[two].forEach(three => {
          if (three < one) {
            //not canonical
            return;
          }
          if (this.getBilaterallyNetted(one, three) <= 0) {
            // not really a hop
            return;
          }
          if (typeof hops[three] === 'undefined') {
            throw new Error('Why does this first hop lead to a leaf?');
          }
          hops[three].forEach(four => {
            if (four < one) {
              //not canonical
              return;
            }
            if (this.getBilaterallyNetted(three, four) <= 0) {
              // not really a hop
              return;
            }  
            if (typeof hops[four] === 'undefined') {
              throw new Error('Why does this second hop lead to a leaf?');
            }
            if (hops[four].indexOf(one) !== -1) {
              if (this.getBilaterallyNetted(four, one) <= 0) {
                // not really a hop
                return;
              }    
              const weight = [
                this.getBilaterallyNetted(one, three),
                this.getBilaterallyNetted(three, four),
                this.getBilaterallyNetted(four, four),
                this.getBilaterallyNetted(four, one),
              ];
              let smallestWeight = (weight[0] < weight[1] ? weight[0] : weight[1]);
              if (weight[2] < smallestWeight) {
                smallestWeight = weight[2];
              }
              // const newBalances = [
              this.addLink(one, four, smallestWeight);
              this.addLink(four, three, smallestWeight);
              this.addLink(three, one, smallestWeight);
              // ];
              // console.log(weight, newBalances, newBalances.map(x => (x ===0)));
              // canonical triangular loop found and removed
              loops.push([one, three, four, smallestWeight.toString()]);
              totalNetted += 3*smallestWeight;
            }
          })
        });
      });
    });
    console.log(`Netted ${totalNetted / 1000000} million in ${loops.length} squares`);
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