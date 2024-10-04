
import { DLD } from '../src/DLD.js';

const SARAFU_CSV = './__tests__/fixture-300.csv';

describe('DLD', () => {
  it('finds loops', async () => {
    const dld = new DLD(SARAFU_CSV, 1);
    const finalProbeId = await dld.runAllWorkers();
    expect(finalProbeId).toEqual(180);
  });
});