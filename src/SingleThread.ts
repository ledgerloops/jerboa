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
    // Running all tasks and then all worms doesn't work, see https://github.com/ledgerloops/jerboa/issues/21
    await new Promise(r => setTimeout(r, 1200));
    // const nums = await Promise.all(this.workers.map(async (worker) => worker.runTasks()));
    const nums = this.workers.map((worker) => worker.getNumProbes());
    // console.log(nums);

    let cumm = 0;
    for (let i = 0; i < nums.length; i++) {
      cumm += nums[i];
    }
    return cumm;
  }
}