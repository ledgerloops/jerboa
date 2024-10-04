import { Worker } from './Worker.js';
import { Message } from './Jerboa.js';

export class DLD {
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
    let cumm = 0;
    await Promise.all(this.workers.map(async (worker) => {
      const doneThisWorker = await worker.run(this.filename);
      cumm += doneThisWorker;
    }));
    return cumm;
  }
}