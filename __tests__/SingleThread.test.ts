
import { SingleThread } from '../src/SingleThread.js';

const SARAFU_CSV = './__tests__/fixtures/sarafu-300.csv';

describe('SingleThread', () => {
  it('finds loops', async () => {
    const threadRunner = new SingleThread({ sarafuFile: SARAFU_CSV, numWorkers: 1 });
    const finalProbeId = await threadRunner.runAllWorkers();
    expect(finalProbeId).toEqual(31);
    expect(await threadRunner.solutionIsComplete()).toEqual(true);
  });
});
