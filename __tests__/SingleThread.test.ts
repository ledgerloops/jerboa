
import { readFileSync } from "fs";
import { SingleThread } from '../src/SingleThread.js';

const SARAFU_CSV = './__tests__/fixtures/sarafu-300.csv';

describe('SingleThread', () => {
  it('finds loops', async () => {
    let solution: string = '';
    const threadRunner = new SingleThread({ sarafuFile: SARAFU_CSV, numWorkers: 1,
      solutionCallback: async (line: string): Promise<void> => {
        console.log(line);
        solution += line;
      }, });
    const cummNumProbes = await threadRunner.runAllWorkers();
    const read = readFileSync(`./__tests__/fixtures/sarafu-300.solution`).toString();
    // if (solution !== read) {
    //   // console.log(`mending test`);
    //   writeFileSync(`./__tests__/fixtures/sarafu-300.solution`, solution);
    // }
    expect(solution).toEqual(read);
    expect(cummNumProbes).toEqual(22);

    expect(await threadRunner.solutionIsComplete()).toEqual(true);
  });
});
