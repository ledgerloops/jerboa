import { jest } from '@jest/globals';
import { Jerboa, JerboaOptions } from '../src/Jerboa.js'; 
function makeJerboa(callback: () => void, name: string): Jerboa {
  // (name: string, solutionCallback: (line: string) => Promise<void> | undefined, sendMessage: (to: string, message: Message)
  const options = {
    name,
    solutionCallback: async (): Promise<void> => {},
    sendMessage: callback
  } as JerboaOptions;
  return new Jerboa(options);
}

describe('Jerboa', () => {
  it('initiates a probe if it can', () => {
    const cb = jest.fn();
    const a = makeJerboa(cb, '0');
    a.addWeight('1', 9);
    // console.log(cb.mock);
    expect(cb).toHaveBeenCalledWith('1', {"amount": 9, "command": "transfer"});
    a.startProbe();
    expect(cb).toHaveBeenCalledWith('1', { command: 'probe', probeId: '0-0', incarnation: 0, debugInfo: {"path":[],"backtracked":[]} });
  });
});
