import { Worker } from './Worker.js';
import { Message } from './Jerboa.js';

export class SingleThread {
  private workers: Worker[] = [];
  private filename: string;
  messagesSent: number = 0;
  messages: { from: string, to: string, message: Message }[] = [];

  constructor(filename: string, numWorkers: number) {
    this.filename = filename;
    for (let i = 0; i < numWorkers; i++) {
      // console.log(`Instantiating worker ${i} of ${numWorkers}`);
      this.workers[i] = new Worker(i, numWorkers, (from: string, to: string, message: Message): void => {
        this.messages.push({from, to, message });
      });
    }
  }
  async runTasks(): Promise<boolean> {
    let hadWorkToDo = false;
    console.log('running tasks', this.messages.length);
    while (this.messages.length > 0) {
      const { from, to, message } = this.messages.pop();
      console.log('popped', from, to, message);
      hadWorkToDo = true;
      const receivingWorker = this.workers[parseInt(to) % this.workers.length];
      receivingWorker.deliverMessageToNodeInThisWorker(from, to, message);
      this.messagesSent++;
    }
    return hadWorkToDo;
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