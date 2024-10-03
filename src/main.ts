import { DLD } from './DLD.js';
import { readCsv } from './readCsv.js';

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = process.argv[2] || './__tests__/fixture-3k.csv';

async function run(): Promise<void> {
  let totalTransAmount = 0;
  let numTrans = 0;
  const dld = new DLD();
  await readCsv(SARAFU_CSV, (source: string, target: string, weight: number) => {
    dld.getWorker(parseInt(source)).addWeight(source, target, weight);
    numTrans++;
    totalTransAmount += weight;
  });
  console.log(`${numTrans} primary transfers with value of ${totalTransAmount} done, now inviting bilateral netting`);
  dld.runAllTasks();
  console.log('bilateral netting done, now inviting probes');
  dld.runAllWorms();
  console.log('done');
}

// ...
run();