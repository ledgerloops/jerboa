import { Worker } from './Worker.js';
import { Message } from './MessageTypes.js';

export class SingleThread {
  private workers: Worker[] = [];
  private filename: string;
  constructor(filename: string, numWorkers: number) {
    this.filename = filename;
    for (let i = 0; i < numWorkers; i++) {
      // console.log(`Instantiating worker ${i} of ${numWorkers}`);
      this.workers[i] = new Worker(i, numWorkers, (from: string, to: string, message: Message): void => {
        const receivingWorker = this.workers[parseInt(to) % this.workers.length];
        receivingWorker.deliverMessageToNodeInThisWorker(from, to, message);
      });
    }
  }
  async runAllWorkers(): Promise<number> {
    await Promise.all(this.workers.map(async (worker) => worker.readTransfersFromCsv(this.filename)));
    await new Promise(r => setTimeout(r, 1200));
    const nums = this.workers.map((worker) => worker.getNumProbes());

    let cumm = 0;
    for (let i = 0; i < nums.length; i++) {
      cumm += nums[i];
    }
    return cumm;
  }
  public getStats(): {
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
    this.workers.forEach(worker => {
      const workerStats = worker.getOurStats();
      stats.messagesReceived += workerStats.messagesReceived;
      stats.messagesSent += workerStats.messagesSent;
      stats.transfersReceived += workerStats.transfersReceived;
      stats.transfersSent += workerStats.transfersSent;
      stats.transferAmount += workerStats.transferAmount;
      stats.bilateralNum += workerStats.bilateralNum;
      stats.bilateralAmount += workerStats.bilateralAmount;
      stats.multilateralNum += workerStats.multilateralNum;
      stats.multilateralAmount += workerStats.multilateralAmount;
      stats.numNodes += workerStats.numNodes;
    });
    return stats;
  }
}
