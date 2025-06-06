import { jest } from '@jest/globals';
import { Jerboa, JerboaOptions } from '../src/Jerboa.js'; 

function makeJerboa(callback: () => void, name: string): Jerboa {
  // (name: string, solutionCallback: (line: string) => Promise<void> | undefined, sendMessage: (to: string, message: Message)
  const options = {
    name,
    solutionCallback: async (): Promise<void> => {},
    sendMessage: callback,
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
  it('forwards a probe if it can', () => {
    const expected = [
      { from: 'a', to: 'b', msg: {"amount": 9, "command": "transfer"} },
      { from: 'b', to: 'c', msg: {"amount": 7, "command": "transfer"} },
      { from: 'a', to: 'b', msg: { command: 'probe', probeId: 'a-0', incarnation: 0, debugInfo: {"path":[],"backtracked":[]} } },
      { from: 'b', to: 'c', msg: { command: 'probe', probeId: 'a-0', incarnation: 0, debugInfo: {"path":[ 'a' ]} } },
    ];
    const callbacks = {
      a: jest.fn(),
      b: jest.fn(),
      c: jest.fn(),
    };
    const nodes = {
      a: makeJerboa(callbacks.a, 'a'),
      b: makeJerboa(callbacks.b, 'b'),
      c: makeJerboa(callbacks.c, 'c'),
    };
    function expectAndDeliver(msgNo: number) {
      expect(callbacks[expected[msgNo].from]).toHaveBeenCalledWith(expected[msgNo].to, expected[msgNo].msg);
      nodes[expected[msgNo].to].receiveMessage(expected[msgNo].from, expected[msgNo].msg);
    }
    nodes.a.addWeight('b', 9); // this will trigger a transfer message from a to b
    expectAndDeliver(0);
    nodes.b.addWeight('c', 7); // this will trigger a transfer message from b to c
    expectAndDeliver(1);
    nodes.a.startProbe();
    expectAndDeliver(2);
    expectAndDeliver(3);
    expect(nodes.a.getCurrentProbeIds()).toEqual(['a-0']);
    expect(nodes.b.getCurrentProbeIds()).toEqual(['a-0']);
    expect(nodes.c.getCurrentProbeIds()).toEqual([]);
    Object.keys(callbacks).forEach((name: string) => {
      console.log(callbacks[name].mock.calls);
    });
  });
});
