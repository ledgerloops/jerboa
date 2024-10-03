import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { DLD } from '../src/DLD.js';

const SARAFU_CSV = './__tests__/fixture-300.csv';

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
    await readCsv((source: string, target: string, weight: number) => {
      // console.log('getting worker', source, parseInt(source));
      const worker = dld.getWorker(parseInt(source));
      worker.addWeight(source, target, weight);
      worker.runTasks();
    });
    const finalProbeId = dld.runWorm();
    expect(finalProbeId).toEqual(178);
  });
});