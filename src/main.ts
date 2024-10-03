import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import process from 'node:process';

import { Worker } from './Worker.js';
import { readCsv } from './readCsv.js';
import { Message } from './Jerboa.js';

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = process.argv[2] || './__tests__/fixture-3k.csv';

const WORKER = parseInt(process.env.WORKER);
const NUM_WORKERS = availableParallelism();

function dispatchMessage(from: string, to: string, message: Message): void {
  process.send({ from, to, message });
}

async function runWorker(): Promise<void> {
  let numTrans = 0;
  let totalTransAmount = 0;
  const worker = new Worker(WORKER, NUM_WORKERS, dispatchMessage);
  await readCsv(SARAFU_CSV, (from: string, to: string, amount: number) => {
    if (parseInt(from) % NUM_WORKERS === WORKER) {
      worker.addWeight(from, to, amount);
      numTrans++;
      totalTransAmount += amount;
    }
  });
  console.log(`[WORKER ${WORKER}] ${numTrans} primary transfers with value of ${totalTransAmount} done, now inviting bilateral netting`);
  worker.runTasks();
  console.log(`WORKER ${WORKER}] bilateral netting done, now inviting probes`);
  worker.runWorm();
  console.log(`WORKER ${WORKER}] done`);
}

// ...


if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running, forking ${NUM_WORKERS} threads` + (typeof runWorker).substring(0));
  // Fork workers.
  const workers = {};
  for (let i = 0; i < NUM_WORKERS; i++) {
    workers[i] = cluster.fork({ WORKER: i });
    workers[i].on('message', (messageObj) => {
      console.log('primary received a', messageObj);
      workers[i].send(`ack ${i}`);
    });
  }
  console.log('sending greetings from primary');
  for (let i = 0; i < NUM_WORKERS; i++) {
    workers[i].send(`hi ${i}`);
  }
  // cluster.on('messageFromWorker', () => {
  //   const receivingWorker
  //   workers[3].send(msg);
  // })
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);
  });
} else {
  process.on('message', (msg) => {
    console.log(`Worker ${WORKER} received message`, msg);
    process.send(msg);
    // const receivingWorker = this.getWorker(parseInt(to));
    // receivingWorker.queueMessageForLocalDelivery(from, to, message);
  });
  console.log(`Worker ${WORKER} started with pid  ${process.pid}`);
  process.send({ foo: `Worker ${WORKER} is alive` });
}