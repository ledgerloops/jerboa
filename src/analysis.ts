import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { BirdsEyeWorm } from './BirdsEyeWorm.js';

const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';

const lineReader = createInterface({
  input: createReadStream(SARAFU_CSV),
});
const nodes: {
  [origId: string]: string
} = {};
let counter = 0;
const birdsEyeWorm = new BirdsEyeWorm();
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
    birdsEyeWorm.addTransfer(nodes[source], nodes[target], parseFloat(weight));
  }
});

lineReader.on('close', function () {
  birdsEyeWorm.runWorm();
});
