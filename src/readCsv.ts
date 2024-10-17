import { createInterface } from 'readline';
import { createReadStream} from 'fs';

export async function readCsv(filename: string, delimiter: string, callback: (cells: string[]) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const lineReader = createInterface({
        input: createReadStream(filename),
      });
      lineReader.on('line', function (line) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        callback(line.split(delimiter));
      });
     
      lineReader.on('close', function () {
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}
export async function readSarafuCsv(filename: string, callback: (from: string, to: string, amount: number) => void): Promise<void> {
  const nodes: {
    [origId: string]: string
  } = {};
  let counter = 0;
  return readCsv(filename, ',', (cells: string[]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [ _id,_timeset, transfer_subtype,source,target,weight,_token_name,_token_address ] = cells;
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
}
