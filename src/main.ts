import { SingleThread } from "./SingleThread.js";

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = process.argv[2] || './__tests__/fixture-3k.csv';

const NUM_WORKERS: number = parseInt(process.env.NUM_WORKERS) || 1;

async function runSingleThread(numWorkers: number): Promise<void> {
  console.log(`Running single thread with ${numWorkers} workers`);
  const threadRunner = new SingleThread(SARAFU_CSV, numWorkers);
  const numProbes = await threadRunner.runAllWorkers();
  console.log(`Finished ${numProbes} probes using ${numWorkers} workers in a single thread`);
  const stats = threadRunner.getStats();
  if (stats.messagesReceived != stats.messagesSent) {
    console.log(`Hm, aggregate stats say ${stats.messagesSent} messages were sent but ${stats.messagesReceived} messages were received`);
  }
  if (stats.transfersReceived != stats.transfersSent) {
    console.log(`Hm, aggregate stats say ${stats.transfersSent} transfers were sent but ${stats.transfersReceived} transfers were received`);
  }
  console.log(`${stats.transfersSent} transfers between ${stats.numNodes} participants triggered an average of ${(stats.messagesSent / stats.transfersSent).toFixed(2)} messages each`);
  console.log(`Transfer amount ${Math.round(stats.transferAmount)}`);
  console.log(`${Math.round((stats.bilateralAmount / stats.transferAmount)*100)}% netted bilaterally`);
  console.log(`${Math.round((stats.multilateralAmount / stats.transferAmount)*100)}% netted multilaterally`);
  console.log(`${Math.round((1 - (stats.bilateralAmount + stats.multilateralAmount) / stats.transferAmount)*100)}% not netted`);
  console.log(stats);
}

// ...
runSingleThread(NUM_WORKERS);