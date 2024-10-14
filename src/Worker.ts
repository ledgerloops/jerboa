import { Jerboa } from "./Jerboa.js";
import { Message } from "./MessageTypes.js";
import { readCsv } from './readCsv.js';

export class Worker {
  messagesSent: number = 0;
  messages: { from: string, to: string, message: Message }[] = [];
  private ourNodes: {
    [from: string]: Jerboa
  } = {};
  running: boolean = false;
  workerNo: number;
  numWorkers: number;
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
    // console.log(`Worker ${this.workerNo} delivering message to node ${to}`, from, to, message, this.messages.length);
    return this.getNode(to).receiveMessage(from, message);
  }
  getNode(name: string): Jerboa {
    this.ensureNode(name);
    return this.ourNodes[name];
  }
  public async work(): Promise<void> {
    do {
      while(this.messages.length > 0) {
        const nextMessage = this.messages.shift();
        this.deliverMessageToNodeInThisWorker(nextMessage.from, nextMessage.to, nextMessage.message);
      }
      await new Promise(r => setTimeout(r, 1000));
    } while(this.messages.length > 0);
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
      // console.log(`constructing node ${name}`);
      this.ourNodes[name] = new Jerboa(name, (to: string, message: Message) => {
        // console.log('our node', name, to, message);
        this.sendMessage(name, to, message);
      });
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
    this.ourNodes[from].addWeight(to, weight);
  }
  async readTransfersFromCsv(filename: string): Promise<void> {
    // this.sendMessage('123', '456', { command: 'test', probeId: '1', incarnation: 0, debugInfo: {} } as Message);
    // console.log('worker waiting 10s before finishing run', filename);
    // await new Promise(resolve => setTimeout(resolve, 10000));
    // return 42;
    // let numTrans = 0;
    // let totalTransAmount = 0;
    await readCsv(filename, (from: string, to: string, amount: number) => {
      if (parseInt(from) % this.numWorkers === this.workerNo) {
        this.addWeight(from, to, amount);
        // numTrans++;
        // totalTransAmount += amount;
      }
    });
    // console.log(`done reading csv`);
  }
  getStats(): void {
    console.log(`Printing stats for ${Object.keys(this.ourNodes).length} Jerboa nodes`);
    Object.keys(this.ourNodes).forEach(name => {
      this.ourNodes[name].getBalanceStats();
    });
  }
  // teardown(): void {
  //   Object.keys(this.ourNodes).forEach(name => {
  //     delete this.ourNodes[name];
  //   });
  // }
}
