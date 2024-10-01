import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { DLD } from './DLD.js';

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const SARAFU_CSV = './__tests__/fixture-3000.csv';

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
    dld.graph.addWeight(nodes[source], nodes[target], parseFloat(weight));
    numTrans++;
    totalTransAmount += parseFloat(weight);
    // dld.graph.messaging.runTasks();
    // dld.graph.runBilateralStats();  
  }
});

lineReader.on('close', function () {
  console.log('primary transfers done, now inviting bilateral netting');
  dld.graph.messaging.runTasks();
  dld.graph.runBilateralStats();
  const totalImmediatelyNetted = dld.graph.stats[2].totalAmount;
  console.log('bilateral netting done, now inviting probes');
  dld.runWorm();
  console.log(dld.graph.stats);
  dld.graph.logNumNodesAndLinks();
  console.log(`After ${numTrans} transactions with a total amount of ${Math.round(totalTransAmount / 1000000)} million`);
  const totalBilateralAmount = 2 * totalImmediatelyNetted;
  console.log(`${Math.round(totalBilateralAmount / 1000000)} million (${Math.round((totalBilateralAmount / totalTransAmount) * 100)}%) was immediately netted bilaterally`);
  let totalNum = 0;
  let totalAmount = 0;
  Object.keys(dld.graph.stats).map(numStr => {
    if (numStr !== '2') {
      totalAmount += dld.graph.stats[numStr].totalAmount * parseInt(numStr);
      totalNum += dld.graph.stats[numStr].numFound;
    }
  });
  const amountLeft = totalTransAmount - totalBilateralAmount - totalAmount;
  console.log(`And a further ${Math.round(totalAmount / 1000000)} million (${Math.round((totalAmount / totalTransAmount) * 100)}%) was netted in ${totalNum} loops`);
  console.log(`Leaving ${Math.round(amountLeft / 1000000)} million (${Math.round((amountLeft / totalTransAmount) * 100)}%) to be settled out of band`);
});
