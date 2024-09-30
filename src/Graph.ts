import { Jerboa } from './Jerboa.js';
import { Messaging } from './Messaging.js';

export class Graph {
  private nodes: {
    [from: string]: Jerboa
  } = {};
  public messaging: Messaging = new Messaging();
  private ensureNode(name: string): void {
    if (typeof this.nodes[name] === 'undefined') {
      this.nodes[name] = new Jerboa();
    }
  }

  // assumes that both graph[from][to] and graph[to][from] exist
  private substractAndRemoveCounterBalance(from: string, to: string): number {
    const amount = this.nodes[to].getBalance(from);
    this.nodes[from].addWeight(to, -amount);
    const ret = this.nodes[to].zeroOut(from);
    if (this.nodes[to].getOutgoingLinks().length === 0) {
      delete this.nodes[to];
    }
    return ret;
  }
  // assumes that graph[from][to] exists
  // @returns number amount netted
  private netBilateralAndRemove(from: string, to: string): number {
    if (typeof this.nodes[to] === 'undefined') {
      return 0;
    }
    if (typeof this.nodes[to].getBalance(from) === 'undefined') {
      return 0;
    }
    if (this.nodes[from].getBalance(to) > this.nodes[to].getBalance(from)) {
      return this.substractAndRemoveCounterBalance(from, to);
    } else if (this.nodes[from].getBalance(to) < this.nodes[to].getBalance(from)) {
      return this.substractAndRemoveCounterBalance(to, from);
    } else { // mutual annihilation
      this.nodes[from].zeroOut(to);
      if (this.nodes[from].getOutgoingLinks().length === 0) {
        delete this.nodes[from];
      }
      const ret = this.nodes[to].zeroOut(from);
      if (this.nodes[to].getOutgoingLinks().length === 0) {
        delete this.nodes[to];
      }
      return ret;
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
    this.ensureNode(from);
    this.nodes[from].addWeight(to, weight);
    return this.netBilateralAndRemove(from, to);
  }
  public removeLink(from: string, to: string): void {
    if (typeof from !== 'string') {
      throw new Error(`from param ${JSON.stringify(from)} is not a string in call to removeLink`);
    }
    if (typeof to !== 'string') {
      throw new Error(`to param ${JSON.stringify(to)} is not a string in call to removeLink`);
    }

    if (typeof this.nodes[from] !== 'undefined') {
      if (typeof this.nodes[from].getBalance(to) !== 'undefined') {
        this.nodes[from].zeroOut(to);
        if (this.nodes[from].getOutgoingLinks().length === 0) {
          delete this.nodes[from];
        }
      }
    }
  }
  public getFirstNode(after?: string): string {
    if ((typeof after !== 'string') && (typeof after !== 'undefined')) {
      throw new Error(`after param ${JSON.stringify(after)} is neither a string nor undefined in call to getFirstNode`);
    }

    let nodes;
    if (typeof after === 'string') {
      const nodesObj = this.nodes[after];
      if (typeof nodesObj === 'undefined') {
        throw new Error(`No outgoing links from node ${after}`);
      }
      nodes = nodesObj.getOutgoingLinks();
    } else {
      nodes = Object.keys(this.nodes);
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
    return ((typeof this.nodes[after] !== 'undefined') && (this.nodes[after].getOutgoingLinks().length >= 1));
  }
  public getWeight(from: string, to: string): number {
    if (typeof from !== 'string') {
      throw new Error(`from param ${JSON.stringify(from)} is not a string in call to getWeight`);
    }
    if (typeof to !== 'string') {
      throw new Error(`to param ${JSON.stringify(to)} is not a string in call to getWeight`);
    }
    if (typeof this.nodes[from] === 'undefined') {
      return 0;
    }
    if (typeof this.nodes[from].getBalance(to) === 'undefined') {
      return 0;
    }
    return this.nodes[from].getBalance(to);
  }
  public getLinks(): {
    [from: string]: {
      [to: string]: number;
    }
  } {
    const links = {};
    Object.keys(this.nodes).forEach(name => {
      const balances = this.nodes[name].getBalances();
      if (Object.keys(balances).length >= 1) {
        links[name] = balances;
      }
    });
    return links;
  }
  public getTotalWeight(): number {
    let total = 0;
    Object.keys(this.nodes).forEach(from => {
      Object.keys(this.nodes[from]).forEach(to => {
        total += this.nodes[from].getBalance(to);
      });
    });
    return total;
  }
}