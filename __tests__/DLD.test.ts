
import { DLD } from '../src/DLD.js';
import { readCsv } from '../src/readCsv.js';

const SARAFU_CSV = './__tests__/fixture-300.csv';

describe('DLD', () => {
  it('finds loops', async () => {
    const dld = new DLD();
    await readCsv(SARAFU_CSV, (source: string, target: string, weight: number) => {
      // console.log('getting worker', source, parseInt(source));
      const worker = dld.getWorker(parseInt(source));
      worker.addWeight(source, target, weight);
      worker.runTasks();
    });
    // console.log('running all DLD worms');
    const finalProbeId = dld.runAllWorms();
    expect(finalProbeId).toEqual(177);
  });
});