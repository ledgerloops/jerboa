const LEDGER_SCALE = 1000;

export class Graph {
  private links: {
    [from: string]: {
      [to: string]: bigint;
    }
  } = {};
  private ensureLink(from: string, to: string): void {
    if (typeof this.links[from] === 'undefined') {
      this.links[from] = {};
    }
    if (typeof this.links[from][to] === 'undefined') {
      this.links[from][to] = 0n;
    }
  }
  // assumes that graph[from][to] exists
  // @returns number amount removed
  private zeroOut(from: string, to: string): bigint {
    const amount = this.links[from][to];
    delete this.links[from][to];
    if (Object.keys(this.links[from]).length === 0) {
      delete this.links[from];
    }
    return amount;
  }
  // assumes that both graph[from][to] and graph[to][from] exist
  private substractAndRemoveCounterBalance(from: string, to: string): bigint {
    const amount = this.links[to][from];
    this.links[from][to] -= amount;
    return this.zeroOut(to, from);
  }
  // assumes that graph[from][to] exists
  // @returns number amount netted
  private netBilateralAndRemove(from: string, to: string): bigint {
    if (typeof this.links[to] === 'undefined') {
      return 0n;
    }
    if (typeof this.links[to][from] === 'undefined') {
      return 0n;
    }
    if (this.links[from][to] > this.links[to][from]) {
      return this.substractAndRemoveCounterBalance(from, to);
    } else if (this.links[from][to] < this.links[to][from]) {
      return this.substractAndRemoveCounterBalance(to, from);
    } else { // mutual annihilation
      this.zeroOut(from, to);
      return this.zeroOut(to, from);
    }
  }
  public addWeight(from: string, to: string, weight: number): number {
    if (typeof from !== 'string') {
      throw new Error(`from param ${JSON.stringify(from)} is not a string in call to addWeight`);
    }
    if (typeof to !== 'string') {
      throw new Error(`to param ${JSON.stringify(to)} is not a string in call to addWeight`);
    }
    if (typeof weight !== 'number') {
      throw new Error(`weight param ${JSON.stringify(weight)} is not a number in call to addWeight`);
    }
 
    if (weight <= 0) {
      throw new Error('weight should be greater than zero');
    }
    this.ensureLink(from, to);
    this.links[from][to] += BigInt(Math.round(weight * LEDGER_SCALE));
    return Number(this.netBilateralAndRemove(from, to)) / LEDGER_SCALE;
  }
  public removeLink(from: string, to: string): void {
    if (typeof from !== 'string') {
      throw new Error(`from param ${JSON.stringify(from)} is not a string in call to removeLink`);
    }
    if (typeof to !== 'string') {
      throw new Error(`to param ${JSON.stringify(to)} is not a string in call to removeLink`);
    }

    if (typeof this.links[from] !== 'undefined') {
      if (typeof this.links[from][to] !== 'undefined') {
        this.zeroOut(from, to);
      }
    }
  }
  public getFirstNode(after?: string): string {
    if ((typeof after !== 'string') && (typeof after !== 'undefined')) {
      throw new Error(`after param ${JSON.stringify(after)} is neither a string nor undefined in call to getFirstNode`);
    }

    let nodes;
    if (typeof after === 'string') {
      const nodesObj = this.links[after];
      if (typeof nodesObj === 'undefined') {
        throw new Error(`No outgoing links from node ${after}`);
      }
      nodes = Object.keys(nodesObj);
    } else {
      nodes = Object.keys(this.links);
      if (nodes.length === 0) {
        throw new Error('Graph is empty');
      }
    }
    return nodes[0];
  }
  public hasOutgoingLinks(after: string): boolean {
    if (typeof after !== 'string') {
      throw new Error(`after param ${JSON.stringify(after)} is not a string in call to hasOutgoingLinks`);
    }
    return (typeof this.links[after] !== 'undefined');
  }
  public getWeight(from: string, to: string): number {
    if (typeof from !== 'string') {
      throw new Error(`from param ${JSON.stringify(from)} is not a string in call to getWeight`);
    }
    if (typeof to !== 'string') {
      throw new Error(`to param ${JSON.stringify(to)} is not a string in call to getWeight`);
    }
    if (typeof this.links[from] === 'undefined') {
      return 0;
    }
    if (typeof this.links[from][to] === 'undefined') {
      return 0;
    }
    return Number(this.links[from][to]) / LEDGER_SCALE;
  }
  public getLinks(): {
    [from: string]: {
      [to: string]: bigint;
    }
  } {
    return this.links;
  }
  public getTotalWeight(): bigint {
    let total = 0n;
    Object.keys(this.links).forEach(from => {
      Object.keys(this.links[from]).forEach(to => {
        total += this.links[from][to];
      });
    });
    return total;
  }
}
