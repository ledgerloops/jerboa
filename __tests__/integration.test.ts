import { jest } from '@jest/globals';

import { readFileSync } from "fs";

let counter: number = 0;
jest.unstable_mockModule('../src/genRanHex.js', () => {
  return{
    genRanHex: jest.fn((): string => {
      return `genRanHex${counter++}`;
    })
  };
});

// [
//   'hourglass',
//   'small',
// ].forEach((name: string): void => {
//   describe(`${name}`, () => {
describe('hourglass', () =>  {
    it ('finds the solution', async () => {
      const name = 'hourglass';
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
      expect(solution).toEqual(readFileSync(`./__tests__/fixtures/${name}.solution`).toString());
    });
  });
// });
