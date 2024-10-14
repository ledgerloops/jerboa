import { SingleThread } from "./SingleThread.js";

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = process.argv[2] || './__tests__/fixture-3k.csv';

const NUM_WORKERS: number = parseInt(process.env.NUM_WORKERS) || 1;

async function runSingleThread(numWorkers: number): Promise<void> {
  console.log(`Running single thread with ${numWorkers} workers`);
  if (numWorkers > 1) {
    throw new Error('Sorry, multiple workers in a single thread is currently not working, see https://github.com/ledgerloops/jerboa/issues/21');
  }
  const threadRunner = new SingleThread(SARAFU_CSV, numWorkers);
  const numProbes = await threadRunner.runAllWorkers();
  console.log(`Finished ${numProbes} probes using ${numWorkers} workers in a single thread`);
}

// ...
runSingleThread(NUM_WORKERS);
