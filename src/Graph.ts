export class Graph {
  private links: {
    [from: string]: {
      [to: string]: number;
    }
  } = {};
  private ensureLink(from: string, to: string): void {
    if (typeof this.links[from] === 'undefined') {
      this.links[from] = {};
    }
    if (typeof this.links[from][to] === 'undefined') {
      this.links[from][to] = 0;
    }
  }
  // assumes that graph[from][to] exists
  private zeroOut(from: string, to: string): void {
    delete this.links[from][to];
    if (Object.keys(this.links[from]).length === 0) {
      delete this.links[from];
    }
  }
  // assumes that both graph[from][to] and graph[to][from] exist
  private substractAndRemoveCounterBalance(from: string, to: string): void {
    const amount = this.links[to][from];
    this.links[from][to] -= amount;
    this.zeroOut(to, from);
  }
  // assumes that graph[from][to] exists
  private netBilateralAndRemove(from: string, to: string): void {
    if (typeof this.links[to] === 'undefined') {
      return;
    }
    if (typeof this.links[to][from] === 'undefined') {
      return;
    }
    if (this.links[from][to] > this.links[to][from]) {
      this.substractAndRemoveCounterBalance(from, to);
    } else if (this.links[from][to] < this.links[to][from]) {
      this.substractAndRemoveCounterBalance(to, from);
    } else { // mutual annihilation
      this.zeroOut(from, to);
      this.zeroOut(to, from);
    }
  }
  public addWeight(from: string, to: string, weight: number): void {
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
    this.links[from][to] += weight;
    this.netBilateralAndRemove(from, to);
  }
  public removeLink(from: string, to: string): void {
    if (typeof from !== 'string') {
      throw new Error(`from param ${JSON.stringify(from)} is not a string in call to removeLink`);
    }
    if (typeof to !== 'string') {
      throw new Error(`to param ${JSON.stringify(to)} is not a string in call to removeLink`);
    }

    if (typeof this.links[from] !== 'undefined') {
      if (typeof this.links[from][to] === 'undefined') {
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
      nodes = this.links[after];
      if (typeof nodes === 'undefined') {
        throw new Error(`No outgoing links from node ${after}`);
      }
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
    return this.links[from][to];
  }
  public getLinks(): {
    [from: string]: {
      [to: string]: number;
    }
  } {
    return this.links;
  }
}