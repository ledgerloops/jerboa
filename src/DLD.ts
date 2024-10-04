import { Worker } from './Worker.js';
import { Message } from './Jerboa.js';

const NUM_WORKERS = 1;

export class DLD {
  private workers: Worker[] = [];
  constructor() {
    for (let i = 0; i < NUM_WORKERS; i++) {
      // console.log(`Instantiating worker ${i} of ${NUM_WORKERS}`);
      this.workers[i] = new Worker(i, NUM_WORKERS, this.dispatchMessage.bind(this));
    }
  }
  dispatchMessage(from: string, to: string, message: Message): void {
    const receivingWorker = this.getWorker(parseInt(to));
    receivingWorker.queueMessageForLocalDelivery(from, to, message);
  }
  getWorker(nodeNo: number): Worker {
    return this.workers[nodeNo % NUM_WORKERS];
  }
  runAllTasks(): void {
    let hadWorkToDo: boolean;
    // console.log('running all tasks');
    do {
      hadWorkToDo = false;
      for (let i = 0; i < NUM_WORKERS; i++) {
        if (this.workers[i].runTasks()) {
          // console.log('had work to do in worker', i);
          hadWorkToDo = true;
        }
      }
    } while (hadWorkToDo);
  }
  runAllWorms(): number {
    let hadWorkToDo: boolean;
    let cumm = 0;
    // console.log('running all worms');
    do {
      hadWorkToDo = false;
      for (let i = 0; i < NUM_WORKERS; i++) {
        // console.log('running worm in worker', i);
        const numThisRun = this.workers[i].runWorm();
        // console.log('had work to do in worker', i);
        if (numThisRun > 0) {
          hadWorkToDo = true;
        }
        cumm += numThisRun;
      }
    } while (hadWorkToDo);
    return cumm;
  }
}