import { Worker } from './Worker.js';
import { Message } from './Jerboa.js';

export class SingleThread {
  private workers: Worker[] = [];
  private filename: string;
  constructor(filename: string, numWorkers: number) {
    this.filename = filename;
    for (let i = 0; i < numWorkers; i++) {
      // console.log(`Instantiating worker ${i} of ${numWorkers}`);
      this.workers[i] = new Worker(i, numWorkers, (from: string, to: string, message: Message): void => {
        const receivingWorker = this.workers[parseInt(to) % this.workers.length];
        receivingWorker.queueMessageForLocalDelivery(from, to, message);
      });
    }
  }
  async runAllWorkers(): Promise<number> {
    await Promise.all(this.workers.map(async (worker) => worker.readTransfersFromCsv(this.filename)));
    // Running all tasks and then all worms doesn't work, see https://github.com/ledgerloops/jerboa/issues/21
    await Promise.all(this.workers.map(async (worker) => worker.runTasks()));
    let cumm = 0;
    await Promise.all(this.workers.map(async (worker) => {
      cumm += worker.runWorm();
    }));
    return cumm;
  }
}