import { writeFile, appendFile } from "node:fs/promises";
import { SingleThread } from "./SingleThread.js";

const SARAFU_FILE = process.argv[2] || '__tests__/fixtures/sarafu-full.csv';
const SOLUTION_FILE = process.argv[3] || '__tests__/fixtures/sarafu-full.solution';
const MAX_SECONDS_BETWEEN_LOOPS = 20;

const NUM_WORKERS: number = parseInt(process.env.NUM_WORKERS) || 1;

async function runSingleThread(numWorkers: number): Promise<void> {
  console.log(`Running single thread with ${numWorkers} workers`);
  await writeFile(SOLUTION_FILE, '');
  let numLoopsFound = 0;
  setInterval(() => {
    console.log(`${numLoopsFound} loops found`);
  }, 1000);

  const threadRunner = new SingleThread({
    sarafuFile: SARAFU_FILE,
    numWorkers, 
    solutionCallback: async (line: string): Promise<void> => {
      if (process.env.VERBOSE) {
        console.log(line);
      } else {
        await appendFile(SOLUTION_FILE, `${line}\n`);
        numLoopsFound++;
      }
    },
    maxSecondsBetweenLoops: MAX_SECONDS_BETWEEN_LOOPS,
  });
  const cummNumProbes = await threadRunner.runAllWorkers();
  console.log(`Finished ${cummNumProbes} probes using ${numWorkers} workers in a single thread`);
  const stats = threadRunner.getStats();
  if (stats.messagesReceived != stats.messagesSent) {
    console.log(`Hm, aggregate stats say ${stats.messagesSent} messages were sent but ${stats.messagesReceived} messages were received`);
  }
  if (stats.transfersReceived != stats.transfersSent) {
    console.log(`Hm, aggregate stats say ${stats.transfersSent} transfers were sent but ${stats.transfersReceived} transfers were received`);
  }
  console.log(`${stats.transfersSent} transfers between ${stats.numNodes} participants triggered an average of ${(stats.messagesSent / stats.transfersSent).toFixed(2)} messages each`);
  console.log(`Transfer amount ${Math.round(stats.transferAmount)}`);
  console.log(`${Math.round((stats.bilateralAmount / stats.transferAmount)*100)}% netted in total`);
  console.log(`${Math.round((stats.multilateralAmount / stats.transferAmount)*100)}% netted multilaterally`);
  console.log(`${Math.round((1 - (stats.bilateralAmount) / stats.transferAmount)*100)}% not netted`);
  console.log(stats);
}

// ...
runSingleThread(NUM_WORKERS);