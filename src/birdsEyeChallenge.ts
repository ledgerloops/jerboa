import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { BirdsEyeWorm } from './BirdsEyeWorm.js';

// const SARAFU_CSV = '../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv';
const DEBTCSV = process.argv[2] || '../strategy-pit/debt.csv';
const SOLUTIONCSV = process.argv[3] || '../strategy-pit/solution.csv';
console.log('Opening', DEBTCSV);

const lineReader = createInterface({
  input: createReadStream(DEBTCSV),
});
let totalTransAmount = 0;
let totalImmediatelyNetted = 0;
let numTrans = 0;
const birdsEyeWorm = new BirdsEyeWorm(true, SOLUTIONCSV);
lineReader.on('line', function (line) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ from, to, amountStr ] = line.split(' ');
  totalImmediatelyNetted += birdsEyeWorm.addTransfer(from, to, parseFloat(amountStr));
  numTrans++;
  totalTransAmount += parseFloat(amountStr);
});

lineReader.on('close', async function () {
  await birdsEyeWorm.runWorm();
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
