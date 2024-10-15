import { createInterface } from 'readline';
import { createReadStream } from 'fs';

export async function readLoops(filename: string, callback: (loop: string[]) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const lineReader = createInterface({
        input: createReadStream(filename),
      });
      lineReader.on('line', function (line) {
        const loop = JSON.parse(line);
        callback(loop);
      });
      
      lineReader.on('close', function () {
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}
 
// ...
const stats: {
  [len: number]: number;
} = {
  0: 0,
};
readLoops('./loops.txt', (loop: string[]) => {
  // const orig = JSON.stringify(loop);
  let smallestEntry = 0;
  for (let i = 0; i < loop.length - 1; i++) {
    if (loop[i] < loop[smallestEntry]) {
      smallestEntry = i;
    }
  }
  loop.splice(loop.length - 1);
  if (loop.length === 2) {
    return; // FIXME: https://github.com/ledgerloops/jerboa/issues/36
  }
  if (typeof stats[loop.length] === 'undefined') {
    stats[loop.length] = 0;
  }
  stats[0]++;
  stats[loop.length]++;
  const lastPart = loop.splice(smallestEntry);
  console.log(JSON.stringify(lastPart.concat(loop).concat(lastPart[0])));
}).then(() => {
  console.log(stats);
});