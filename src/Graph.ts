import { Jerboa } from './Jerboa.js';
import { Messaging } from './Messaging.js';

export class Graph {
  private nodes: {
    [from: string]: Jerboa
  } = {};
  public messaging: Messaging = new Messaging(this);
  stats: {
    [loopLength: number]: {
      numFound: number;
      totalAmount: number;
    }
  } = {};
 
  private ensureNode(name: string): void {
    if (typeof this.nodes[name] === 'undefined') {
      this.nodes[name] = new Jerboa(name, this);
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
    this.ensureNode(from);
    this.nodes[from].addWeight(to, weight);
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
  public getFirstNode(withOutgoingLinks: boolean, after?: string): string {
    if ((typeof after !== 'string') && (typeof after !== 'undefined')) {
      throw new Error(`after param ${JSON.stringify(after)} is neither a string nor undefined in call to getFirstNode`);
    }

    let nodes: string[];
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
    if (withOutgoingLinks) {
      for (let i = 0; i < nodes.length; i++) {
        if ((typeof this.nodes[nodes[i]] !== 'undefined') && (this.nodes[nodes[i]].getOutgoingLinks().length >= 1)) {
          return nodes[i];
        }
      }
    } else {
      return nodes[0];
    }
    throw new Error('no nodes have outgoing links');
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
  report(loopLength: number, amount: number): void {
    // if (loopLength > 2) {
    //   console.log('report', loopLength, amount);
    // }
    if (typeof this.stats[loopLength] === 'undefined') {
      this.stats[loopLength] = {
        numFound: 0,
        totalAmount: 0
      };
    }
    this.stats[loopLength].numFound++;
    this.stats[loopLength].totalAmount += amount;
  }
  getNode(name: string): Jerboa {
    this.ensureNode(name);
    return this.nodes[name];
  }
  getNodes(): Jerboa[] {
    return Object.values(this.nodes);
  }
}