
import { writeFile, appendFile } from "node:fs/promises";
import { SingleThread } from "./SingleThread.js";

const DEBT_CSV = process.argv[2] || '../strategy-pit/debt.csv';
const SOLUTION_CSV = process.argv[3] || '../strategy-pit/jerboa.csv';

const NUM_WORKERS: number = parseInt(process.env.NUM_WORKERS) || 1;

async function runSingleThread(numWorkers: number): Promise<void> {
  console.log(`Running single thread with ${numWorkers} workers`);
  console.log('resetting solution file', SOLUTION_CSV);
  await writeFile(SOLUTION_CSV, '');
  const threadRunner = new SingleThread({
    debtFile: DEBT_CSV,
    numWorkers, 
    solutionCallback: async (line: string): Promise<void> => {
      await appendFile(SOLUTION_CSV, line);
    }
  });
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
  console.log(`${Math.round((stats.bilateralAmount / stats.transferAmount)*100)}% netted in total`);
  console.log(`${Math.round((stats.multilateralAmount / stats.transferAmount)*100)}% netted multilaterally`);
  console.log(`${Math.round((1 - (stats.bilateralAmount) / stats.transferAmount)*100)}% not netted`);
  console.log(stats);
}

// ...
runSingleThread(NUM_WORKERS);