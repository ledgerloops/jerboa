import { SingleThread } from "../src/SingleThread.js";
import { readFileSync } from "fs";

[
  'hourglass',
  'small',
].forEach((name: string) => {
  describe(name, () => {
    it ('finds the solution', async () => {
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
});
