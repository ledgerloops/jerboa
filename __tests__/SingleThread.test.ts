
import { readFileSync, writeFileSync } from "fs";
import { SingleThread } from '../src/SingleThread.js';

const SARAFU_CSV = './__tests__/fixtures/sarafu-10k.csv';

describe('SingleThread', () => {
  it('finds loops', async () => {
    let solution: string = '';
    const threadRunner = new SingleThread({ sarafuFile: SARAFU_CSV, numWorkers: 1,
      solutionCallback: async (line: string): Promise<void> => {
        solution += line;
      }, });
    const cummNumProbes = await threadRunner.runAllWorkers();
    const read = readFileSync(`./__tests__/fixtures/sarafu-10k.solution`).toString();
    if (solution !== read) {
      // console.log(`mending test`);
      writeFileSync(`./__tests__/fixtures/sarafu-10k.solution`, solution);
    }
    expect(solution).toEqual(read);
    expect(cummNumProbes).toEqual(60);

    expect(await threadRunner.solutionIsComplete()).toEqual(true);
  });
});
