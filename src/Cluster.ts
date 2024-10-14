import cluster from 'node:cluster';
import { createServer } from 'http';
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
    // console.log(`Primary ${process.pid} is running, forking ${this.numWorkers} threads`);
    // Fork workers.
    const workers = {};
    const probing = {};
    for (let i = 0; i <this. numWorkers; i++) {
      probing[i] = true;
      workers[i] = cluster.fork({ WORKER: i });
      workers[i].on('message', (messageObj: { from: string, to: string, message: object } | string): void => {
        const sender = i;
        if (messageObj as string === 'done') {
          // console.log(sender, 'DONE WITH PROBES');
          delete probing[sender];
        } else {
          const recipientWorker = parseInt((messageObj as { from: string, to: string, message: object }).to) % this.numWorkers;
          console.log('should primary forwards this', messageObj, `to worker ${recipientWorker}?`);
          // this.lastMessageSeen = Date.now();
          // workers[recipientWorker].send(messageObj);
        }
      });
      await new Promise(resolve => {
        workers[i].on('online', () => {
          // console.log(`Worker ${i} is online`);
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
    let numWorkersDone = 0;
    cluster.on('exit', (worker, code, signal) => {
      if (signal) {
        console.log(`worker ${worker.id} was killed by signal: ${signal}`);
      } else if (code !== 0) {
        console.log(`worker ${worker.id} exited with error code: ${code}`);
      } else {
        console.log(`worker ${worker.id} success!`);
      }
      numWorkersDone++;
    });
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`${numWorkersDone} of ${this.numWorkers} done`);
    } while (numWorkersDone < this.numWorkers);
    console.log(`Looks like all workers are done now`);
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
    const worker = new Worker(workerNo, this.numWorkers, async (from: string, to: string, message: Message): Promise<void> => {
      // console.log(`Worker ${workerNo} sends message to primary`, { from, to, message });
      const toWorker = parseInt(to) % this.numWorkers;
      const toPort = 9000 + toWorker;
      // console.log(`Worker ${workerNo} sends message to worker ${toWorker} on port ${toPort}`);
      /* const result = */ await fetch(`http://localhost:${toPort}`, {
        method: 'POST',
        body: JSON.stringify({ from, to, message })
      });
      // console.log(`Worker ${workerNo} sent message to worker ${toWorker} on port ${toPort}`, result.status);
    });
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', async () => {
        const msg = JSON.parse(body);
        // console.log(msg);
        const { from, to, message } = msg as { from: string, to: string, message: Message };
        // console.log(`Worker ${workerNo} received message`, from, to, message);
        // worker.deliverMessageToNodeInThisWorker(from, to, message);
        worker.queueMessageForLocalDelivery(from, to, message);
        res.writeHead(200);
        res.end();
      });
    });
    const port = 9000 + workerNo;
    server.listen(port);
    // console.log(`Worker ${workerNo} listening for http POSTs on port ${port}`);
 
    return new Promise((resolve) => {
      process.on('message', async (msg) => {
        if (typeof msg === 'string') {
          // console.log(`Worker ${workerNo} received message of string type`, msg);
          const parts = msg.split(' ');
          switch(parts[0]) {
            case `start`: {
              console.log(`Worker ${workerNo} is starting`);
              worker.readTransfersFromCsv(this.filename);
              console.log(`Worker ${workerNo} finished reading csv, starting work`);
              await worker.work();
              console.log(`Worker ${workerNo} finished work`);
              break;
            }
            case `shutdown`: {
              console.log(`Worker ${workerNo} received shutdown message from primary`);
              worker.teardown();
              resolve(42);
              break;
            }
            default: {
              console.log('unknown string message from primary', msg);
            }
          }
        } else {
          console.log(`Worker ${workerNo} received message of non-string type`, msg);
        }
      });
    });
  }
}