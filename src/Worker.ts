import { Jerboa } from "./Jerboa.js";
import { Message } from "./MessageTypes.js";
import { readSarafuCsv, readCsv } from './readCsv.js';

export class Worker {
  messagesSent: number = 0;
  messages: { from: string, to: string, message: Message }[] = [];
  private ourNodes: {
    [from: string]: Jerboa
  } = {};
  stats: {
    [loopLength: number]: {
      numFound: number;
      totalAmount: number;
    }
  } = {};
  workerNo: number;
  numWorkers: number;
  private sendMessage: (from: string, to: string, message: Message) => void;
  private solutionCallback: (string) => void;
  constructor(workerNo: number, noWorkers: number, solutionCallback: (string) => void, sendMessage: (from: string, to: string, message: Message) => void) {
    this.workerNo = workerNo;
    this.numWorkers = noWorkers;
    this.solutionCallback = solutionCallback;
    this.sendMessage = sendMessage;
  }
  public reportState(cb: (string) => void): void {
    Object.keys(this.ourNodes).forEach((name: string) => {
      this.ourNodes[name].reportState(cb);
    });
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
  public async deliverOneMessage(): Promise<boolean> {
    if (this.messages.length === 0) {
      return false;
    }
    const msg = this.messages.shift();
    // console.log('delivering', msg);
    await this.deliverMessageToNodeInThisWorker(msg.from, msg.to, msg.message);
    return true;
  }
  async deliverMessageToNodeInThisWorker(from: string, to: string, message: Message): Promise<void> {
    this.messagesSent++;
    // console.log(`Worker ${this.workerNo} delivering message to node ${to}`, from, to, message, this.messages.length);
    return this.getNode(to).receiveMessage(from, message);
  }
  getNumProbes(): number {
    const nodeNames = Object.keys(this.ourNodes);
    let cumm = 0;
    for (let i = 0; i < nodeNames.length; i++) {
      cumm += this.ourNodes[nodeNames[i]].getNumProbesMinted();
    }
    return cumm;
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
      this.ourNodes[name] = new Jerboa(name, this.solutionCallback, (to: string, message: Message) => {
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
  public getOurStats(): {
    messagesReceived: number;
    messagesSent: number;
    transfersReceived: number;
    transfersSent: number;
    transferAmount: number;
    bilateralNum: number;
    bilateralAmount: number;
    multilateralNum: number;
    multilateralAmount: number;
    numNodes: number;
  } {
    const stats: {
      messagesReceived: number;
      messagesSent: number;
      transfersReceived: number;
      transfersSent: number;
      transferAmount: number;
      bilateralNum: number;
      bilateralAmount: number;
      multilateralNum: number;
      multilateralAmount: number;
      numNodes: number;
    } = {
      messagesReceived: 0,
      messagesSent: 0,
      transfersReceived: 0,
      transfersSent: 0,
      transferAmount: 0,
      bilateralNum: 0,
      bilateralAmount: 0,
      multilateralNum: 0,
      multilateralAmount: 0,
      numNodes: 0,
    };
    Object.keys(this.ourNodes).forEach(name => {
      stats.messagesReceived += this.ourNodes[name].messagesReceived;
      stats.messagesSent += this.ourNodes[name].messagesSent;
      stats.transfersReceived += this.ourNodes[name].transfersReceived;
      stats.transfersSent += this.ourNodes[name].transfersSent;
      stats.transferAmount += this.ourNodes[name].transfersReceivedAmount;
      const { num, amount } = this.ourNodes[name].getBilateralStats();
      stats.bilateralAmount += amount;
      stats.bilateralNum += num;
      stats.multilateralNum += this.ourNodes[name].multilateralNum;
      stats.multilateralAmount += this.ourNodes[name].multilateralAmount;
      stats.numNodes++;
    });
    // console.log(`Worker ${this.workerNo} return stats`, stats);
    return stats;
  }
  getNode(name: string): Jerboa {
    this.ensureNode(name);
    return this.ourNodes[name];
  }
  async readTransfersFromCsv(filename: string): Promise<void> {
    await readSarafuCsv(filename, (from: string, to: string, amount: number) => {
      if (parseInt(from) % this.numWorkers === this.workerNo) {
        this.addWeight(from, to, amount);
      }
    });
  }
  async readDebtFromCsv(filename: string): Promise<void> {
    await readCsv(filename, ' ', (cells: string[]) => {
      const [ from, to, amountStr ] = cells;
      const amount = parseFloat(amountStr);
      if (parseInt(from) % this.numWorkers === this.workerNo) {
        this.addWeight(from, to, amount);
      }
    });
  }
}
