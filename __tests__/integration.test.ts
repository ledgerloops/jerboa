import { SingleThread } from "../src/SingleThread.js";

describe('Hourglass', () => {
  it ('finds two loops', async () => {
    let solution: string = '';
    const threadRunner = new SingleThread({
      debtFile: './__tests__/hourglass.csv',
      solutionCallback: async (line: string): Promise<void> => {
        solution += line;
      },
      numWorkers: 1
    });
    const numProbes = await threadRunner.runAllWorkers();
    const stats = threadRunner.getStats();
    expect(numProbes).toEqual(2);
    expect(stats).toEqual({
      bilateralAmount: 7,
      bilateralNum: 7,
      messagesReceived: 35,
      messagesSent: 35,
      multilateralAmount: 7,
      multilateralNum: 7,
      numNodes: 6,
      transferAmount: 7,
      transfersReceived: 7,
      transfersSent: 7,
    });
    expect(solution).toEqual(`\
1 2 3 1
1 4 5 6 1
`);
  });
});
