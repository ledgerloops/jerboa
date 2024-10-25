
import { readFileSync } from "fs";
import { SingleThread } from '../src/SingleThread.js';

function runTest(testName: string, numProbesExpected: number): void {
  describe('SingleThread', () => {
    it('finds loops', async () => {
      let solution: string = '';
      const threadRunner = new SingleThread({ sarafuFile: `./__tests__/fixtures/${testName}.csv`, numWorkers: 1,
        solutionCallback: async (line: string): Promise<void> => {
          solution += line;
        }, });
      const cummNumProbes = await threadRunner.runAllWorkers();
      const read = readFileSync(`./__tests__/fixtures/${testName}.solution`).toString();
      // if (solution !== read) {
      //   // console.log(`mending test`);
      //   writeFileSync(`./__tests__/fixtures/${testName}.solution`, solution);
      // }
      expect(solution).toEqual(read);
      expect(cummNumProbes).toEqual(numProbesExpected);

      expect(await threadRunner.solutionIsComplete()).toEqual(true);
    });
  });
}

// ...
runTest('sarafu-300', 78);
runTest('sarafu-10k', 628);
runTest('sarafu-50k', 0);
// runTest('sarafu-100k', 0);
// runTest('sarafu-full', 0);
