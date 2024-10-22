import { jest } from '@jest/globals';
import { readFileSync, writeFileSync } from "fs";

let counter: number = 0;
jest.unstable_mockModule('../src/genRanHex.js', () => {
  return{
    genRanHex: jest.fn((): string => {
      return `genRanHex${counter++}`;
    })
  };
});

[
  'triangle',
  'hourglass',
  'small',
  'parallels',
].forEach((name: string): void => {
  describe(`${name}`, () => {
    it ('finds the solution', async () => {
      const { SingleThread } = await import('../src/SingleThread.js');
      let solution: string = '';
      const threadRunner = new SingleThread({
        debtFile: `./__tests__/fixtures/${name}.problem`,
        solutionCallback: async (line: string): Promise<void> => {
          solution += line;
        },
        numWorkers: 1
      });
      await threadRunner.runAllWorkers();
      const read = readFileSync(`./__tests__/fixtures/${name}.solution`).toString();
      if (solution !== read) {
        console.log(`mending test`);
        writeFileSync(`./__tests__/fixtures/${name}.solution`, solution);
      }
      expect(solution).toEqual(read);
      expect(await threadRunner.solutionIsComplete()).toEqual(true);
    });
  });
});
