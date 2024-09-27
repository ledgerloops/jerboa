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
let totalTransAmount = 0;
let numTrans = 0;
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
    numTrans++;
    totalTransAmount += parseFloat(weight);
  }
});

lineReader.on('close', function () {
  birdsEyeWorm.runWorm();
  console.log(birdsEyeWorm.stats);
  const links = birdsEyeWorm.graph.getLinks();
  let numLinks = 0;
  Object.keys(links).forEach(from => {
    numLinks += Object.keys(links[from]).length;
  });
  console.log(`Graph has ${Object.keys(links).length} nodes and ${numLinks} links left`);
  console.log(`After ${numTrans} transactions with a total amount of ${totalTransAmount / 1000000} million`);
  // console.log(`${2 * birdsEyeWorm.stats['2'].totalAmount / 1000000} million was immediately netted bilaterally`);
  // console.log(`And a further ${(Object.keys(birdsEyeWorm.stats).map(numStr => birdsEyeWorm.stats[numStr].totalAmount * parseInt(numStr)).reduce((x,y) => (x+y), 0)) / 1000000} million was netted in ${Object.keys(birdsEyeWorm.stats).map(numStr => birdsEyeWorm.stats[numStr].numFound).reduce((x,y) => (x+y), 0)} loops`);
});
