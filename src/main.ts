import { Worker } from './Worker.js';
import { readCsv } from './readCsv.js';
import { Message } from './Jerboa.js';

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = process.argv[2] || './__tests__/fixture-3k.csv';
const WORKER = 0;
const NUM_WORKERS = 1;

function dispatchMessage(from: string, to: string, message: Message): void {
  const receivingWorker = this.getWorker(parseInt(to));
  receivingWorker.queueMessageForLocalDelivery(from, to, message);
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
runWorker();