import cluster from 'node:cluster';
import process from 'node:process';

// import { availableParallelism } from 'node:os';
import { Cluster } from "./Cluster.js";

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = process.argv[2] || './__tests__/fixture-3k.csv';

const NUM_WORKERS = 1; // availableParallelism();

async function run(workerNo: number): Promise<number> {
  const dld = new Cluster(SARAFU_CSV, NUM_WORKERS);
  if (cluster.isPrimary) {
    return dld.runPrimary();
  } else {
    const promise = dld.runWorker(workerNo);
    console.log(`Worker ${workerNo} started with pid  ${process.pid}`);
    await promise;
    console.log(`runWorker ${workerNo} done`);
    // process.send({ foo: `Worker ${WORKER} is alive` });
    return 42; // This will never be returned to the main thread, will it?
  }
}

// ...
run(parseInt(process.env.WORKER)); // this will fork NUM_WORKERS additional processes