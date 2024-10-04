import cluster from 'node:cluster';

import { Worker } from './Worker.js';
import { Message } from './Jerboa.js';

export class Cluster {
  private filename: string;
  private numWorkers: number;
  private lastMessageSeen: number;
  constructor(filename: string, numWorkers: number) {
    this.filename = filename;
    this.numWorkers = numWorkers;
  }
  async runPrimary(): Promise<number> {
    console.log(`Primary ${process.pid} is running, forking ${this.numWorkers} threads`);
    // Fork workers.
    const workers = {};
    const forwardMessage = (messageObj: { from: string, to: string, message: object }): void => {
      const recipientWorker = parseInt(messageObj.to) % this.numWorkers;
      console.log('primary forwards', messageObj, `to worker ${recipientWorker}`);
      this.lastMessageSeen = Date.now();
      workers[recipientWorker].send(messageObj);
    };
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
    await new Promise(resolve => {
      const timer = setInterval(() => {
        const silence = (Date.now() - this.lastMessageSeen);
        console.log(`Checking silence ${silence}`);
        if (silence > 1000) {
          clearInterval(timer);
          resolve(true);
        }
      }, 100);
    });
    for (let probeId = 0; probeId < 2; probeId++) {
      console.log(`Primary sends signal to ${probeId % this.numWorkers} to start probe ${probeId}`);
      workers[probeId % this.numWorkers].send(`startProbe ${probeId}`);
      console.log('probe started, waiting for silence again');
      await new Promise(resolve => {
        const timer = setInterval(() => {
          const silence = (Date.now() - this.lastMessageSeen);
          console.log(`Checking silence ${silence}`);
          if (silence > 1000) {
            clearInterval(timer);
            resolve(true);
          }
        }, 100);
      });
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
        if (typeof msg === 'string') {
          console.log(`Worker ${workerNo} received message of string type`, msg);
          const parts = msg.split(' ');
          switch(parts[0]) {
            case `start`: {
              worker.readTransfersFromCsv(this.filename);
              break;
            }
            case `shutdown`: {
              console.log(`Worker ${workerNo} received shutdown message from primary`);
              worker.teardown();
              resolve(42);
              break;
            }
            case `startProbe`: {
              console.log(`Worker ${workerNo} starts worm ${parts[1]}`);
              worker.runOneWorm(parseInt(parts[1]));
              break;
            }
            default: {
              console.log('unknown string message from primary', msg);
            }
          }
        } else {
          console.log(`Worker ${workerNo} received message of non-string type`, msg);
          const { from, to, message } = msg as { from: string, to: string, message: Message };
          worker.queueMessageForLocalDelivery(from, to, message);
        }
      });
    });
  }
}