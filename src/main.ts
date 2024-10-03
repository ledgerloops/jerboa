import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { DLD } from './DLD.js';

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = process.argv[2] || './__tests__/fixture-3k.csv';
console.log('Opening', SARAFU_CSV);

const lineReader = createInterface({
  input: createReadStream(SARAFU_CSV),
});
const nodes: {
  [origId: string]: string
} = {};
let counter = 0;
let totalTransAmount = 0;
let numTrans = 0;
const dld = new DLD();
lineReader.on('line', function (line) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ _id,_timeset, transfer_subtype,source,target,weight,_token_name,_token_address ] = line.split(',');
  if (typeof nodes[source] === 'undefined') {
    nodes[source] = (counter++).toString();
  }
  if (typeof nodes[target] === 'undefined') {
    nodes[target] = (counter++).toString();
  }
  if (transfer_subtype === 'STANDARD') {
    dld.workers[0].addWeight(nodes[source], nodes[target], parseFloat(weight));
    numTrans++;
    totalTransAmount += parseFloat(weight);
  }
});

lineReader.on('close', function () {
  console.log(`${numTrans} primary transfers with value of ${totalTransAmount} done, now inviting bilateral netting`);
  dld.workers[0].messaging.runTasks();
  console.log('bilateral netting done, now inviting probes');
  dld.runWorm();
  console.log('done');
});
