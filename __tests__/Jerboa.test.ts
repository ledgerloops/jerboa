import { Jerboa, Message } from '../src/Jerboa.js';
import { Worker } from '../src/Worker.js';
import { Messaging } from '../src/Messaging.js';
// jest.mock('../src/Graph.js');
jest.mock('../src/Messaging.js');

function makeJerboa(worker: Worker, name: string): Jerboa {
  return new Jerboa('0', (to: string, message: Message) => {
    console.log('our node', name, to, message);
    worker.receiveMessage(name, to, message);
  }, () => {});
}

describe('Jerboa', () => {
  it ('returns false if it cannot initiate a probe', () => {
    const worker = new Worker(0, 1);
    const a = new Jerboa('0', worker.receiveMessage.bind(worker), () => {});
    const result = a.startProbe('probe-id');
    expect(result).toEqual(false);
  });
  it ('initiates a probe if it can', () => {
    const worker = new Worker(0, 1);
    worker.ourMessaging = new Messaging(worker);
    worker.ourMessaging.sendMessage = jest.fn();
    const a = makeJerboa(worker, '0');
    a.addWeight('1', 9);
    expect(worker.ourMessaging.sendMessage).toHaveBeenCalledWith('0', '1', {"amount": 9, "command": "transfer"});
    const result = a.startProbe('probe-id');
    expect(result).toEqual(true);
    expect(worker.ourMessaging.sendMessage).toHaveBeenCalledWith('0', '1', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: {"path":[],"backtracked":[]} });
  });
  it('forwards a probe if it can', () => {
    const worker = new Worker(0, 1);
    worker.ourMessaging = new Messaging(worker);
    worker.ourMessaging.sendMessage = jest.fn();
    const a = makeJerboa(worker, '0');
    a.addWeight('1', 9);
    expect(worker.ourMessaging.sendMessage).toHaveBeenCalledWith('0', '1', {"amount": 9, "command": "transfer"});
    a.receiveMessage('999', { command: 'probe', probeId: '1', incarnation: 123, debugInfo: { path: ['1', '2'], backtracked: [] } } as Message);
    expect(worker.ourMessaging.sendMessage).toHaveBeenCalledWith('0', '1', { command: 'probe', probeId: '1', incarnation: 123, debugInfo: { path: ['1', '2', '999'], backtracked: []} });
  });
  it('splices off a loop if it can', () => {
    const worker = new Worker(0, 1);
    worker.ourMessaging = new Messaging(worker);
    worker.ourMessaging.sendMessage = jest.fn();
    // rather than calling `new Jerboa('3'), getting the Jerboas from the graph
    // will allow them to query each other for debugging
    // do note though that since we mocked graph.messaging, messages sent by these
    // nodes will still not arrive:
    const d = worker.getNode('3');
    const e = worker.getNode('4');
    const f = worker.getNode('5');
    d.addWeight('4', 9);
    e.receiveMessage('3', { command: 'transfer', amount: 9 });
    e.addWeight('5', 9);
    f.receiveMessage('4', { command: 'transfer', amount: 9 });
    f.addWeight('3', 9);
    d.receiveMessage('5', { command: 'transfer', amount: 9 });
    expect(d.getBalances()).toEqual({ 4: 9, 5: -9 });
    expect(e.getBalances()).toEqual({ 5: 9, 3: -9 });
    expect(f.getBalances()).toEqual({ 3: 9, 4: -9 });
    expect(worker.ourMessaging.sendMessage).toHaveBeenCalledWith('3', '4', {"amount": 9, "command": "transfer"});
    d.receiveMessage('2', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: ['0', '1'], backtracked: [] } });
    expect(worker.ourMessaging.sendMessage).toHaveBeenCalledWith('3', '4', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: ['0', '1', '2'], backtracked: [] } });
    d.receiveMessage('5', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: ['0', '1', '2', '3', '4'], backtracked: [] } }); // so the probe has P-looped as: a-b-c-[d-e-f-d]
    expect(worker.ourMessaging.sendMessage).toHaveBeenCalledWith('3', '5', { command: 'scout', probeId: 'probe-id', maxIncarnation: 0, amount: 9, debugInfo: { loop: ['3', '4', '5', '3']} });
  });
  it ('replies with nack if it is a leaf', () => {
    const worker = new Worker(0, 1);
    worker.ourMessaging = new Messaging(worker);
    worker.ourMessaging.sendMessage = jest.fn();
    const a = makeJerboa(worker, '0');
    a.receiveMessage('999', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: [], backtracked: [] } });
    expect(worker.ourMessaging.sendMessage).toHaveBeenCalledWith('0', '999', { command: 'nack', probeId: 'probe-id', incarnation: 0, debugInfo: { path: [], backtracked: []} });
  });
});