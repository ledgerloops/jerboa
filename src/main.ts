import cluster from 'node:cluster';
import process from 'node:process';

// import { availableParallelism } from 'node:os';
import { Cluster } from "./Cluster.js";
import { SingleThread } from "./SingleThread.js";

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = process.argv[2] || './__tests__/fixture-3k.csv';

const NUM_WORKERS = 10; // availableParallelism();

async function runCluster(numWorkers: number): Promise<number> {
  const workerNo = parseInt(process.env.WORKER);
  const workerCluster = new Cluster(SARAFU_CSV, numWorkers);
  if (cluster.isPrimary) {
    const promise = workerCluster.runPrimary();
    console.log(`runPrimary promise pending in pid ${process.pid}`);
    await promise;
    console.log(`runPrimary promise resolved in pid ${process.pid}`);
    return 42;
  } else {
    const promise = workerCluster.runWorker(workerNo);
    console.log(`runWorker promise pending for worker ${workerNo} pid ${process.pid}`);
    await promise;
    console.log(`runWorker promise resolved for worker ${workerNo} pid ${process.pid}`);
    // process.send({ foo: `Worker ${WORKER} is alive` });
    return 42; // This will never be returned to the main thread, will it?
  }
}

async function runSingleThread(numWorkers: number): Promise<void> {
  const threadRunner = new SingleThread(SARAFU_CSV, numWorkers);
  const numProbes = await threadRunner.runAllWorkers();
  console.log(`Finished ${numProbes} probes using ${numWorkers} workers in a single thread`);
}

// ...
if (process.env.CLUSTER) {
  runCluster(NUM_WORKERS); // this will fork NUM_WORKERS additional processes
} else {
  runSingleThread(NUM_WORKERS); // this will fork NUM_WORKERS additional processes
}