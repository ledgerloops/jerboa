import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { DLD } from '../src/DLD.js';

const SARAFU_CSV = './__tests__/fixture.csv';

async function readCsv(callback: (from: string, to: string, amount: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const lineReader = createInterface({
        input: createReadStream(SARAFU_CSV),
      });
      const nodes: {
        [origId: string]: string
      } = {};
      let counter = 0;
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
          callback(nodes[source], nodes[target], parseFloat(weight));
        }
      });
      
      lineReader.on('close', function () {
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

describe('DLD', () => {
  it('finds loops', async () => {
    const dld = new DLD();
    await readCsv(dld.addTransfer.bind(dld));
    dld.runWorm();
    // const links = dld.graph.getLinks();
    // let numLinks = 0;
    // Object.keys(links).forEach(from => {
    //   numLinks += Object.keys(links[from]).length;
    // });
    let totalNum = 0;
    let totalAmount = 0;
    Object.keys(dld.graph.stats).map(numStr => {
      if (numStr !== '2') {
        totalAmount += dld.graph.stats[numStr].totalAmount * parseInt(numStr);
        totalNum += dld.graph.stats[numStr].numFound;
      }
    });
    expect(totalNum).toEqual(3);
    expect(totalAmount).toEqual(210);
    expect(dld.graph.stats).toEqual({
      "2": {
       "numFound": 151,
       "totalAmount": 5579.5,
     },
     "3": {
       "numFound": 3,
       "totalAmount": 70,
     }
    });
  });
});