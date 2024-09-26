import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { ConnectivityMatrix } from './ConnectivityMatrix.js';

const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';

const lineReader = createInterface({
  input: createReadStream(SARAFU_CSV),
});
const nodes = {};
let counter = 0;
const connectivityMatrix = new ConnectivityMatrix();
lineReader.on('line', function (line) {
  // console.log('Line from file:', line);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ _id,_timeset, transfer_subtype,source,target,weight,_token_name,_token_address ] = line.split(',');
  if (typeof nodes[source] === 'undefined') {
    nodes[source] = counter++;
  }
  if (typeof nodes[target] === 'undefined') {
    nodes[target] = counter++;
  }
  // if ((transfer_subtype === 'STANDARD') && (counter <= 10)) {
  if (transfer_subtype === 'STANDARD') {
    connectivityMatrix.addLink(nodes[source], nodes[target], parseFloat(weight));
  }
  // console.log({ id, timeset, transfer_subtype, source, target, weight });
});

lineReader.on('close', function () {
    connectivityMatrix.print();
    let numRemoved = 0;
    do {
      numRemoved = connectivityMatrix.removeLeaves();
    } while(numRemoved > 0);
});
