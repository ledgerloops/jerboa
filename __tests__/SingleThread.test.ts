
import { SingleThread } from '../src/SingleThread.js';

const SARAFU_CSV = './__tests__/fixture-300.csv';

describe('SingleThread', () => {
  it('finds loops', async () => {
    const threadRunner = new SingleThread(SARAFU_CSV, 1);
    const finalProbeId = await threadRunner.runAllWorkers();
    expect(finalProbeId).toEqual(181);
  });
});