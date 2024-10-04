import cluster from 'node:cluster';

import { Worker } from './Worker.js';
import { Message } from './Jerboa.js';

export class Cluster {
  private filename: string;
  private numWorkers: number;
  constructor(filename: string, numWorkers: number) {
    this.filename = filename;
    this.numWorkers = numWorkers;
  }
  async runPrimary(): Promise<number> {
    console.log(`Primary ${process.pid} is running, forking ${this.numWorkers} threads`);
    // Fork workers.
    const workers = {};
    for (let i = 0; i <this. numWorkers; i++) {
      workers[i] = cluster.fork({ WORKER: i });
      workers[i].on('message', (messageObj) => {
        const recipientWorker = parseInt(messageObj.from) % this.numWorkers;
        // console.log('primary forwards', messageObj, recipientWorker);
        workers[recipientWorker].send(messageObj);
      });
      await new Promise(resolve => {
        workers[i].on('online', resolve);
      });
    }
    console.log('sending greetings from primary');
    for (let i = 0; i < this.numWorkers; i++) {
      workers[i].send(`start`);
    }
    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);
    });
    return 0;
  }
  async runWorker(workerNo: number): Promise<number> {
    const worker = new Worker(workerNo, this.numWorkers, (from: string, to: string, message: Message): void => {
      process.send({ from, to, message });
    });
    return new Promise((resolve) => {
      process.on('message', async (msg) => {
        console.log(`Worker ${workerNo} received message`, msg);
        if (msg === `start`) {
          resolve(worker.run(this.filename));
        } else {
          // process.send(msg);
          const { from, to, message } = msg as { from: string, to: string, message: Message };
          // const receivingWorker = this.getWorker(parseInt(to));
          worker.queueMessageForLocalDelivery(from, to, message);
        }
      });
    });
  }
}