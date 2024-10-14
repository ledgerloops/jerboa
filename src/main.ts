import { Worker } from "./Worker.js";
import { Message } from "./MessageTypes.js";

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = process.argv[2] || './__tests__/fixture-3k.csv';

async function runWorker(): Promise<void> {
  const worker = new Worker(0, 1, (from: string, to: string, message: Message): void => {
    worker.deliverMessageToNodeInThisWorker(from, to, message);
  });
  await worker.readTransfersFromCsv(SARAFU_CSV);
  worker.getStats();
}


// ...
runWorker(); // this will fork NUM_WORKERS additional processes