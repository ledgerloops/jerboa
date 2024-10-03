import { Jerboa } from './Jerboa.js';
import { Messaging } from "./Messaging.js";
import { Message } from "./Jerboa.js";

export class Worker {
  private ourNodes: {
    [from: string]: Jerboa
  } = {};
  private ourNodesToStartFrom: {
    [from: string]: boolean
  } = {};
  public ourMessaging: Messaging = new Messaging(this);
  stats: {
    [loopLength: number]: {
      numFound: number;
      totalAmount: number;
    }
  } = {};
  private shard: number;
  private noShards: number;
  constructor(shard: number, noShards: number) {
    this.shard = shard;
    this.noShards = noShards;
  }
  public receiveMessage(from: string, to: string, message: Message): void {
    if (this.nodeIsOurs(to)) {
      // instead of delivering immediately, queue it up until runTasks is called on this worker:
      // this.getNode(to).receiveMessage(from, message);
      this.ourMessaging.sendMessage(from , to, message);
    }
  }
  private nodeIsOurs(name: string) : boolean {
    const nodeNo = parseInt(name);
    if (isNaN(nodeNo)) {
      throw new Error('node name is not a number ' + name);
    }
    return (nodeNo % this.noShards === this.shard);    
  }
  private ensureNode(name: string): void {
    if (!this.nodeIsOurs(name)) {
      throw new Error('node is not ours!');
    }
    if (typeof this.ourNodes[name] === 'undefined') {
      this.ourNodes[name] = new Jerboa(name, (to: string, message: Message) => {
        // console.log('our node', name, to, message);
        this.receiveMessage(name, to, message);
      }, () => {
        this.deregister(name);
      });
      this.ourNodesToStartFrom[name] = true;
    }
  }
  public deregister(name: string): void {
    delete this.ourNodesToStartFrom[name];
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
    this.ourNodes[from].addWeight(to, weight);
  }

  public getOurFirstNode(withOutgoingLinks: boolean, after?: string): string {
    if ((typeof after !== 'string') && (typeof after !== 'undefined')) {
      throw new Error(`after param ${JSON.stringify(after)} is neither a string nor undefined in call to getFirstNode`);
    }

    let nodes: string[];
    if (typeof after === 'string') {
      if (!this.nodeIsOurs(after)) {
        throw new Error(`After node ${after} is not ours in call to getFirstNode!`);
      }
      const nodesObj = this.ourNodes[after];
      if (typeof nodesObj === 'undefined') {
        throw new Error(`No outgoing links from node ${after}`);
      }
      nodes = nodesObj.getOutgoingLinks();
    } else {
      nodes = Object.keys(this.ourNodesToStartFrom);
      if (nodes.length === 0) {
        throw new Error('Graph is empty');
      }
    }
    if (withOutgoingLinks) {
      for (let i = 0; i < nodes.length; i++) {
        if ((typeof this.ourNodes[nodes[i]] !== 'undefined') && (this.ourNodes[nodes[i]].getOutgoingLinks().length >= 1)) {
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
    if (!this.nodeIsOurs(after)) {
      throw new Error(`After node ${after} is not ours in call to hasOutgoingLinks!`);
    }
    return ((typeof this.ourNodes[after] !== 'undefined') && (this.ourNodes[after].getOutgoingLinks().length >= 1));
  }
  public getWeight(from: string, to: string): number {
    if (typeof from !== 'string') {
      throw new Error(`from param ${JSON.stringify(from)} is not a string in call to getWeight`);
    }
    if (!this.nodeIsOurs(from)) {
      throw new Error(`From node ${from} is not ours in call to getWeight!`);
    }
    if (typeof to !== 'string') {
      throw new Error(`to param ${JSON.stringify(to)} is not a string in call to getWeight`);
    }
    if (typeof this.ourNodes[from] === 'undefined') {
      return 0;
    }
    return this.ourNodes[from].getBalance(to);
  }
  public getOurBalances(): {
    [from: string]: {
      [to: string]: number;
    }
  } {
    const links = {};
    Object.keys(this.ourNodes).forEach(name => {
      links[name] = this.ourNodes[name].getBalances();
    });
    return links;
  }
  getNode(name: string): Jerboa {
    this.ensureNode(name);
    return this.ourNodes[name];
  }
  getOurNodes(): Jerboa[] {
    return Object.values(this.ourNodes);
  }
}