import { Jerboa, Message } from '../src/Jerboa.js';
function makeJerboa(callback: () => void, name: string): Jerboa {
  return new Jerboa(name, callback, () => {});
}

describe('Jerboa', () => {
  it ('returns false if it cannot initiate a probe', () => {
    const cb = jest.fn();
    const a = makeJerboa(cb, '0');
    const result = a.startProbe('probe-id');
    expect(result).toEqual(false);
  });
  it('initiates a probe if it can', () => {
    const cb = jest.fn();
    const a = makeJerboa(cb, '0');
    a.addWeight('1', 9);
    expect(cb).toHaveBeenCalledWith('1', {"amount": 9, "command": "transfer"});
    const result = a.startProbe('probe-id');
    expect(result).toEqual(true);
    expect(cb).toHaveBeenCalledWith('1', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: {"path":[],"backtracked":[]} });
  });
  it('forwards a probe if it can', () => {
    const cb = jest.fn();
    const a = makeJerboa(cb, '0');
    a.addWeight('1', 9);
    expect(cb).toHaveBeenCalledWith('1', {"amount": 9, "command": "transfer"});
    a.receiveMessage('999', { command: 'probe', probeId: '1', incarnation: 123, debugInfo: { path: ['1', '2'], backtracked: [] } } as Message);
    expect(cb).toHaveBeenCalledWith('1', { command: 'probe', probeId: '1', incarnation: 123, debugInfo: { path: ['1', '2', '999'], backtracked: []} });
  });
  it('splices off a loop if it can', () => {
    const cb3 = jest.fn();
    const cb4 = jest.fn();
    const cb5 = jest.fn();
    // rather than calling `new Jerboa('3'), getting the Jerboas from the graph
    // will allow them to query each other for debugging
    // do note though that since we mocked graph.messaging, messages sent by these
    // nodes will still not arrive:
    const d = makeJerboa(cb3, ('3'));
    const e = makeJerboa(cb4, ('4'));
    const f = makeJerboa(cb5, ('5'));
    d.addWeight('4', 9);
    e.receiveMessage('3', { command: 'transfer', amount: 9 });
    e.addWeight('5', 9);
    f.receiveMessage('4', { command: 'transfer', amount: 9 });
    f.addWeight('3', 9);
    d.receiveMessage('5', { command: 'transfer', amount: 9 });
    expect(d.getBalances()).toEqual({ 4: 9, 5: -9 });
    expect(e.getBalances()).toEqual({ 5: 9, 3: -9 });
    expect(f.getBalances()).toEqual({ 3: 9, 4: -9 });
    expect(cb3).toHaveBeenCalledWith('4', {"amount": 9, "command": "transfer"});
    d.receiveMessage('2', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: ['0', '1'], backtracked: [] } });
    expect(cb3).toHaveBeenCalledWith('4', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: ['0', '1', '2'], backtracked: [] } });
    d.receiveMessage('5', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: ['0', '1', '2', '3', '4'], backtracked: [] } }); // so the probe has P-looped as: a-b-c-[d-e-f-d]
    expect(cb3).toHaveBeenCalledWith('5', { command: 'scout', probeId: 'probe-id', maxIncarnation: 0, amount: 9, debugInfo: { loop: ['3', '4', '5', '3']} });
  });
  it ('replies with nack if it is a leaf', () => {
    const cb = jest.fn();
    const a = makeJerboa(cb, '0');
    a.receiveMessage('999', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: [], backtracked: [] } });
    expect(cb).toHaveBeenCalledWith('999', { command: 'nack', probeId: 'probe-id', incarnation: 0, debugInfo: { path: [], backtracked: []} });
  });
});