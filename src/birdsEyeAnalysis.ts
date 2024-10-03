import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { BirdsEyeWorm } from './BirdsEyeWorm.js';

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
let totalImmediatelyNetted = 0;
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
    totalImmediatelyNetted += birdsEyeWorm.addTransfer(nodes[source], nodes[target], parseFloat(weight));
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
  // console.log(birdsEyeWorm.stats);
  console.log(`Graph has ${Object.keys(links).length} nodes and ${numLinks} links left`);
  console.log(`After ${numTrans} transactions with a total amount of ${Math.round(totalTransAmount / 1000000)} million`);
  const totalBilateralAmount = 2 * totalImmediatelyNetted;
  console.log(`${Math.round(totalBilateralAmount / 1000000)} million (${Math.round((totalBilateralAmount / totalTransAmount) * 100)}%) was immediately netted bilaterally`);
  let totalNum = 0;
  let totalAmount = 0;
  Object.keys(birdsEyeWorm.stats).map(numStr => {
    if (numStr !== '2') {
      totalAmount += birdsEyeWorm.stats[numStr].totalAmount * parseInt(numStr);
      totalNum += birdsEyeWorm.stats[numStr].numFound;
    }
  });
  const amountLeft = totalTransAmount - totalBilateralAmount - totalAmount;
  console.log(`And a further ${Math.round(totalAmount / 1000000)} million (${Math.round((totalAmount / totalTransAmount) * 100)}%) was netted in ${totalNum} loops`);
  console.log(`Leaving ${Math.round(amountLeft / 1000000)} million (${Math.round((amountLeft / totalTransAmount) * 100)}%) to be settled out of band`);
});
