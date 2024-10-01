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
  
    // negative weights are currently used Jerboa#netLoop
    if (weight === 0) {
      throw new Error('weight should be greater than zero');
    }
    this.ensureNode(from);
    this.nodes[from].addWeight(to, weight);
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
    return this.nodes[from].getBalance(to);
  }
  public getBalances(): {
    [from: string]: {
      [to: string]: number;
    }
  } {
    const links = {};
    Object.keys(this.nodes).forEach(name => {
      links[name] = this.nodes[name].getBalances();
    });
    return links;
  }
  public logNumNodesAndLinks(): void {
    const numNodes = Object.keys(this.nodes).length;
    let numLinks = 0;
    Object.keys(this.nodes).forEach(name => {
      const outgoingLinks = Object.keys(this.nodes[name].getBalances());
      numLinks += outgoingLinks.length;
    });
    console.log(`Graph has ${numNodes} nodes and ${numLinks} links left`);
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
    if (typeof this.stats[loopLength] === 'undefined') {
      this.stats[loopLength] = {
        numFound: 0,
        totalAmount: 0
      };
    }
    this.stats[loopLength].numFound++;
    this.stats[loopLength].totalAmount += amount;
  }
  runBilateralStats(): void {
    let numFoundPos = 0;
    let numFoundNeg = 0;
    let amountFoundPos = 0;
    let amountFoundNeg = 0;
    
    Object.keys(this.nodes).forEach((name: string) => {
      const archiveWeights = this.nodes[name].getArchiveWeights();
      Object.keys(archiveWeights).forEach((other: string) => {
        // console.log('archiveWeights', name, other, archiveWeights[other]);
        if (archiveWeights[other] > 0) {
          numFoundPos++;
          amountFoundPos += archiveWeights[other];
        }
        if (archiveWeights[other] < 0) {
          numFoundNeg++;
          amountFoundNeg -= archiveWeights[other];
        }
      });
    });
    if (numFoundPos !== numFoundNeg) {
      throw new Error(`discrepancy in numFound ${numFoundPos} vs ${numFoundNeg}`);
    }
    if (Math.abs(amountFoundPos - amountFoundNeg) > 0.000001) {
      throw new Error(`discrepancy in amountFound ${amountFoundPos} vs ${amountFoundNeg}`);
    }
    this.stats[2] = {
      numFound: numFoundPos,
      totalAmount: amountFoundPos,
    };
  }
  getNode(name: string): Jerboa {
    this.ensureNode(name);
    return this.nodes[name];
  }
  getNodes(): Jerboa[] {
    return Object.values(this.nodes);
  }
}