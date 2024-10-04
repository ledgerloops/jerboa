
import { Cluster } from '../src/Cluster.js';

const SARAFU_CSV = './__tests__/fixture-300.csv';

describe('DLD', () => {
  it('finds loops', async () => {
    const dld = new Cluster(SARAFU_CSV, 1);
    const finalProbeId = await dld.runWorker(0);
    expect(finalProbeId).toEqual(177);
  });
});