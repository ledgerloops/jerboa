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
    let forwardMessage;
    const done = new Promise(resolve => {
      let timeout;
      timeout = setTimeout(resolve, 10000);
      forwardMessage = (messageObj: { from: string, to: string, message: object }): void => {
        const recipientWorker = parseInt(messageObj.to) % this.numWorkers;
        // console.log('primary forwards', messageObj, `to worker ${recipientWorker}`);
        clearTimeout(timeout);
        timeout = setTimeout(resolve, 1000);
        // console.log('primary will finish in 1000ms from now');
        workers[recipientWorker].send(messageObj);
      };
    });
    for (let i = 0; i <this. numWorkers; i++) {
      workers[i] = cluster.fork({ WORKER: i });
      workers[i].on('message', forwardMessage);
      await new Promise(resolve => {
        workers[i].on('online', () => {
          console.log(`Worker ${i} is online`);
          resolve(true);
        });
      });
    }
    // console.log('Primary takes a 1000ms break');
    await new Promise(resolve => setTimeout(resolve, 1000));
    // console.log('sending greetings from primary');
    for (let i = 0; i < this.numWorkers; i++) {
      workers[i].send(`start`);
    }
    cluster.on('exit', (worker, code, signal) => {
      if (signal) {
        console.log(`worker ${worker.id} was killed by signal: ${signal}`);
      } else if (code !== 0) {
        console.log(`worker ${worker.id} exited with error code: ${code}`);
      } else {
        console.log(`worker ${worker.id} success!`);
      }
    });
    await done;
    for (let i = 0; i <this. numWorkers; i++) {
      workers[i].send('shutdown');
      workers[i].disconnect();
      setTimeout(() => {
        workers[i].kill();
      }, 2000);
    }
    return 0;
  }
  async runWorker(workerNo: number): Promise<number> {
    const worker = new Worker(workerNo, this.numWorkers, (from: string, to: string, message: Message): void => {
      // console.log(`Worker ${workerNo} sends message to primary`, { from, to, message });
      process.send({ from, to, message });
    });
    return new Promise((resolve) => {
      process.on('message', async (msg) => {
        // console.log(`Worker ${workerNo} received message from primary`, msg);
        if (msg === `start`) {
          worker.readTransfersFromCsv(this.filename);
        } else if (msg === `shutdown`) {
          console.log(`Worker ${workerNo} received shutdown message from primary`);
          worker.teardown();
          resolve(42);
        } else {
          const { from, to, message } = msg as { from: string, to: string, message: Message };
          worker.queueMessageForLocalDelivery(from, to, message);
        }
      });
    });
  }
}