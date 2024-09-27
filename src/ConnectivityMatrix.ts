function randomFromArray(arr: string[]): string {
  const rnd = Math.random();
  const index = Math.floor(rnd * arr.length);
  return arr[index];
}

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
  hops: {
    [from: string]: string[];
  };
  stats: {
    [loopLength: number]: {
      numFound: number;
      totalAmount: number;
    }
  } = {};

  getBilaterallyNetted(from: string, to: string): number {
    const [lower, higher, sign] = (parseInt(from) < parseInt(to) ? [from, to, 1] : [to, from, -1]);
    // console.log(lower, higher, sign);
    if (typeof this.matrix[lower] === 'undefined') {
      // console.log('this.matrix[lower] undefined, returning 0');
      return 0;
    }
    if (typeof this.matrix[lower][higher] === 'undefined') {
      // console.log('this.matrix[lower][higher] not defined, returning 0');
      return 0;
    }
    const candidate = sign * this.matrix[lower][higher].bilaterallyNetted;
    if (Object.is(candidate, -0)) {
      // console.log('Returning 0 (avoiding -0)');
      return 0;
    } else {
      // console.log(`Returning ${sign}*${this.matrix[lower][higher].bilaterallyNetted}`);
      return candidate;
    }
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
    if (parseInt(linkFrom) < parseInt(linkTo)) {
      this.ensureCell(linkFrom, linkTo);
      this.matrix[linkFrom][linkTo].forward.push(weight);
      this.matrix[linkFrom][linkTo].bilaterallyNetted += weight;
      return this.matrix[linkFrom][linkTo].bilaterallyNetted;
    } else if (parseInt(linkFrom) === parseInt(linkTo)) {
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
    if (linksRemoved > 1000) {
      console.log({ hermits, sources, internals, drains, linksRemoved });
    }
    return linksRemoved;
  }
  getCurrentHops(): void {
    this.hops = {};
    Object.keys(this.matrix).forEach(lower => {
      if (Object.keys(this.matrix[lower]).length === 0) {
        throw new Error('how can this matrix row exist but be empty?');
      }
      Object.keys(this.matrix[lower]).forEach(higher => {
        if (this.matrix[lower][higher].bilaterallyNetted > 0) {
          if (typeof this.hops[lower] === 'undefined') {
            this.hops[lower] = [];
          }
          this.hops[lower].push(higher);
          // if (this.getBilaterallyNetted(lower, higher) <= 0) {
          //   console.log(lower, higher, this.matrix[lower][higher]);
          //   throw new Error('this doesnt look like a hop 1');
          // }    
          // if (this.getBilaterallyNetted(higher, lower) >= 0) {
          //   console.log(lower, higher, this.matrix[lower][higher]);
          //   throw new Error('this doesnt look like a hop 2');
          // }    
        } else if (this.matrix[lower][higher].bilaterallyNetted < 0) {
          if (typeof this.hops[higher] === 'undefined') {
            this.hops[higher] = [];
          }
          this.hops[higher].push(lower);
          // if (this.getBilaterallyNetted(lower, higher) >= 0) {
          //   console.log(lower, higher, this.matrix[lower][higher]);
          //   throw new Error('this doesnt look like a hop 3');
          // }
          // if (this.getBilaterallyNetted(higher, lower) <= 0) {
          //   console.log(lower, higher, this.matrix[lower][higher]);
          //   throw new Error('this doesnt look like a hop 4');
          // }
        }
      });
    });
    Object.keys(this.hops).forEach(from => {
      this.hops[from].forEach(to => {
        if (this.getBilaterallyNetted(from, to) <= 0) {
          throw new Error(`Something went wrong in getCurrentHops between ${from} and ${to}`);
        }
      });
    });
  }
  netLoop(loop: string[]): number {
    let smallestWeight = Infinity;
    for (let k = 0; k < loop.length - 1; k++) {
      const thisWeight = this.getBilaterallyNetted(loop[k], loop[k+1]);
      // console.log(`Weight on loop from ${loop[k]} to ${loop[k+1]} is ${thisWeight}`);
      if (thisWeight < smallestWeight) {
        smallestWeight = thisWeight;
      }
    }
    if (smallestWeight === 0) {
      return 0;
    }
    for (let k = 0; k < loop.length - 1; k++) {
      const before = this.getBilaterallyNetted(loop[k], loop[k+1]);
      this.addLink(loop[k+1], loop[k], smallestWeight);
      const after = this.getBilaterallyNetted(loop[k], loop[k+1]);
      if (after >= before) {
        throw new Error('balance not decreased by loop?');
      }
      // console.log(`Balance between ${loop[k]} and ${loop[k+1]} reduced from ${before} to ${after}`);
    }
    // console.log('netted loop', loop);
    return smallestWeight;
  }
  netPolygons(sides: number): number {
    // console.log('netPolygons', sides);
    if (typeof this.stats[sides] === 'undefined') {
      this.stats[sides] = {
        numFound: 0,
        totalAmount: 0,
      }
    }
    const before = this.stats[sides].totalAmount;
    if (sides < 2) {
      throw new Error(`Cannot net polygons with ${sides} sides`);
    }
    if (sides === 2) {
      this.bilateralNetting();
      return this.stats[sides].totalAmount - before; 
    }
    let found;
    do {
      found = false;
      this.getCurrentHops();
      // console.log('current hops refreshed');
      // Start at one of the nodes that have a least one outgoing hop
      Object.keys(this.hops).forEach(startNode => {
        // if (found) {
        //   return;
        // }
        if (sides === 5) {
          console.log([startNode]);
        }
        found = this.nestLoop([startNode], sides);
      });
    } while(found);
    return this.stats[sides].totalAmount - before; 
  }
  nestLoop(path: string[], sides: number): boolean {
    // if ((sides === 5) && (path.length === 1) && (path[0] === '1918')) {
    //   console.log(path);
    // }
    // if ((sides === 5) && (path.length === 2) && (path[0] === '1918') && (path[1] === '2115')) {
    //   console.log(path);
    // }
    // if ((sides === 5) && (path.length === 3) && (path[0] === '1918') && (path[1] === '2115') && (path[2] === '1766')) {
    //   console.log(path);
    // }
    // if ((sides === 5) && (path.length === 4) && (path[0] === '1918') && (path[1] === '2115') && (path[2] === '1766') && (path[3] === '67')) {
    //   console.log(path);
    // }
    // if ((sides === 5) && (path.length === 5) && (path[0] === '1918') && (path[1] === '2115') && (path[2] === '1766') && (path[3] === '67') && (path[4] === '1918')) {
    //   console.log(path);
    // }

    // console.log('nestLoop', path, sides);
    if (path.length === sides) {
      return this.finishLoop(path);
    }
    // Choose a node that can be reached from the path's last node
    let found = false;
    this.hops[path[path.length - 1]].forEach(nextNode => {
      // if (found) {
      //   return;
      // }
      if (this.getBilaterallyNetted(path[path.length - 1], nextNode) <= 0) {
        // throw new Error('not really a hop');
        return;
      }
      if (typeof this.hops[nextNode] === 'undefined') {
        // throw new Error('Why does this hop lead to a leaf?');
        return;
      }
      // recursion
      found = this.nestLoop(path.concat(nextNode), sides);
    });
    return found;
  }
  finishLoop(path: string[]): boolean {
    if (this.hops[path[path.length - 1]].indexOf(path[0]) !== -1) {
      // console.log('loop found', path);
      if (this.getBilaterallyNetted(path[path.length - 1], path[0]) <= 0) {
        // throw new Error('not really a hop');
        return false;
      }
      const smallestWeight = this.netLoop(path);
      if (smallestWeight === 0) {
        return false;
      }
      this.stats[path.length].numFound++;
      this.stats[path.length].totalAmount += path.length*smallestWeight;
      return true;
    } else {
      // console.log('no loop', path);
      return false;
    }
  }

  netWithWorm(minExpectedLoopLength: number): number {
    let totalNetted = 0;
    this.getCurrentHops();
    const path = [];
    let newItem = randomFromArray(Object.keys(this.hops));
    while(path.indexOf(newItem) === -1) {
      path.push(newItem);
      newItem = randomFromArray(this.hops[newItem]);
      if (this.getBilaterallyNetted(path[path.length - 1], newItem) <= 0) {
        throw new Error(`non-positive balance on path between ${path[path.length - 1]} and ${newItem}`);
      // } else {
      //   console.log(`Balance on path hop from ${path[path.length - 1]} to ${newItem} is OK: ${this.getBilaterallyNetted(path[path.length - 1], newItem)}`);
      }
    }
    const loop = path.slice(path.indexOf(newItem)).concat([newItem]);
    const smallestWeight = this.netLoop(loop);
    if (loop.length - 1 < minExpectedLoopLength) {
      console.log(`Found loop of length ${loop.length}`, loop, smallestWeight);
      // throw new Error('How come we find such a short loop still?');
    }
    totalNetted += smallestWeight * (loop.length - 1);
    return totalNetted;
  }
  bilateralNetting(): void {
    this.stats[2] = {
      numFound: 0,
      totalAmount: 0,
    };
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
        if (bilateral > 0) {  
          this.stats[2].numFound++;
          this.stats[2].totalAmount += 2*bilateral;
        }
        check += Math.abs(this.matrix[lower][higher].bilaterallyNetted);
        numTrans += this.matrix[lower][higher].forward.length + this.matrix[lower][higher].backward.length;
      });
    });
    console.log(`Checking that ${check} + 2*${bilateral} = ${check+2*bilateral} equals ${total}`);
    console.log(`Total (millions): ${total / 1000000} in ${numTrans} transactions, of which bilaterally nettable: ${Math.round((2*bilateral / total)*100)}%`);
  }
}