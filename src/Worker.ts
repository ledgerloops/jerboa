import { Jerboa, Message } from "./Jerboa.js";
import { readCsv } from './readCsv.js';

export class Worker {
  messagesSent: number = 0;
  messages: { from: string, to: string, message: Message }[] = [];
  private ourNodes: {
    [from: string]: Jerboa
  } = {};
  private ourNodesToStartFrom: {
    [from: string]: boolean
  } = {};
  stats: {
    [loopLength: number]: {
      numFound: number;
      totalAmount: number;
    }
  } = {};
  private workerNo: number;
  private numWorkers: number;
  private sendMessage: (from: string, to: string, message: Message) => void;
  constructor(shard: number, noShards: number, sendMessage: (from: string, to: string, message: Message) => void) {
    this.workerNo = shard;
    this.numWorkers = noShards;
    this.sendMessage = sendMessage;
  }
  public queueMessageForLocalDelivery(from: string, to: string, message: Message): void {
    if (this.nodeIsOurs(to)) {
      // instead of delivering immediately, queue it up until runTasks is called on this worker:
      // this.getNode(to).receiveMessage(from, message);
      // console.log('pushing onto message queue of length', this.messages.length);
      this.messages.push({from, to, message });
    } else {
      throw Error('to node is not ours');
    }
  }
  deliverMessageToNodeInThisWorker(from: string, to: string, message: Message): void {
    this.messagesSent++;
    // console.log('delivering message', from, to, message, this.messages.length);
    return this.getNode(to).receiveMessage(from, message);
  }
  runTasks(): boolean {
    let hadWorkToDo = false;
    // console.log('running tasks', this.messages.length);
    while (this.messages.length > 0) {
      const { from, to, message } = this.messages.pop();
      // console.log('popped', from, to, message);
      hadWorkToDo = true;
      this.deliverMessageToNodeInThisWorker(from, to, message);
    }
    return hadWorkToDo;
  }

  private nodeIsOurs(name: string) : boolean {
    const nodeNo = parseInt(name);
    if (isNaN(nodeNo)) {
      throw new Error('node name is not a number ' + name);
    }
    // console.log(`comparing`, nodeNo, this.numWorkers, nodeNo % this.numWorkers, this.workerNo);
    return (nodeNo % this.numWorkers === this.workerNo);    
  }
  private ensureNode(name: string): void {
    if (!this.nodeIsOurs(name)) {
      throw new Error('node is not ours!');
    }
    if (typeof this.ourNodes[name] === 'undefined') {
      this.ourNodes[name] = new Jerboa(name, (to: string, message: Message) => {
        // console.log('our node', name, to, message);
        this.sendMessage(name, to, message);
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
  private async runWorm(): Promise<number> {
    let done = false;
    let probeId = 0;
    do {
      let newStep: string;
      // console.log('starting probe', probeId);
      try {
        newStep = this.getOurFirstNode(true);
        console.log('picked first new step!', newStep, this.getNode(newStep).getOutgoingLinks());
      } catch (e) {
        if ((e.message === 'Graph is empty') || (e.message == 'no nodes have outgoing links')) {
          done = true;
          return probeId;
        } else {;
          throw e;
        }
      }
      console.log('calling startProbe', newStep, probeId);
      this.getNode(newStep).startProbe(probeId.toString());
      console.log('done starting probe from', newStep);
      this.runTasks();
      await new Promise(resolve => setTimeout(resolve, 1000));
      probeId++;
    } while (!done);
    return probeId;
  }
  async run(filename: string): Promise<number> {
    // this.sendMessage('123', '456', { command: 'test', probeId: '1', incarnation: 0, debugInfo: {} } as Message);
    // console.log('worker waiting 10s before finishing run', filename);
    // await new Promise(resolve => setTimeout(resolve, 10000));
    // return 42;
    let numTrans = 0;
    let totalTransAmount = 0;
    await readCsv(filename, (from: string, to: string, amount: number) => {
      if (parseInt(from) % this.numWorkers === this.workerNo) {
        this.addWeight(from, to, amount);
        numTrans++;
        totalTransAmount += amount;
      }
    });
    console.log(`[WORKER ${this.workerNo}] ${numTrans} primary transfers with value of ${totalTransAmount} done, now inviting bilateral netting`);
    this.runTasks();
    console.log(`WORKER ${this.workerNo}] bilateral netting done, now inviting probes`);
    const maxProbeId = await this.runWorm();
    console.log(`WORKER ${this.workerNo}] done`);
    return maxProbeId;
  }
}
