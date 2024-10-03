import { Jerboa, ProbeMessage } from '../src/Jerboa.js';
import { Worker } from '../src/Worker.js';
import { Messaging } from '../src/Messaging.js';
// jest.mock('../src/Graph.js');
jest.mock('../src/Messaging.js');



describe('Jerboa', () => {
  it ('returns false if it cannot initiate a probe', () => {
    const graph = new Worker(0, 1);
    const a = new Jerboa('0', graph);
    const result = a.startProbe('probe-id');
    expect(result).toEqual(false);
  });
  it ('initiates a probe if it can', () => {
    const graph = new Worker(0, 1);
    graph.ourMessaging = new Messaging(graph);
    graph.ourMessaging.sendMessage = jest.fn();
    const a = new Jerboa('0', graph);
    a.addWeight('1', 9);
    expect(graph.ourMessaging.sendMessage).toHaveBeenCalledWith('0', '1', {"amount": 9, "command": "transfer"});
    const result = a.startProbe('probe-id');
    expect(result).toEqual(true);
    expect(graph.ourMessaging.sendMessage).toHaveBeenCalledWith('0', '1', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: {"path":[],"backtracked":[]} });
  });
  it('forwards a probe if it can', () => {
    const graph = new Worker(0, 1);
    graph.ourMessaging = new Messaging(graph);
    graph.ourMessaging.sendMessage = jest.fn();
    const a = new Jerboa('0', graph);
    a.addWeight('1', 9);
    expect(graph.ourMessaging.sendMessage).toHaveBeenCalledWith('0', '1', {"amount": 9, "command": "transfer"});
    a.receiveMessage('x', { command: 'probe', probeId: '1', incarnation: 123, debugInfo: { path: ['1', '2'], backtracked: [] } } as ProbeMessage);
    expect(graph.ourMessaging.sendMessage).toHaveBeenCalledWith('0', '1', { command: 'probe', probeId: '1', incarnation: 123, debugInfo: { path: ['1', '2', 'x'], backtracked: []} });
  });
  it('splices off a loop if it can', () => {
    const graph = new Worker(0, 1);
    graph.ourMessaging = new Messaging(graph);
    graph.ourMessaging.sendMessage = jest.fn();
    // rather than calling `new Jerboa('3'), getting the Jerboas from the graph
    // will allow them to query each other for debugging
    // do note though that since we mocked graph.messaging, messages sent by these
    // nodes will still not arrive:
    const d = graph.getNode('3');
    const e = graph.getNode('4');
    const f = graph.getNode('5');
    d.addWeight('4', 9);
    e.receiveMessage('3', { command: 'transfer', amount: 9 });
    e.addWeight('5', 9);
    f.receiveMessage('4', { command: 'transfer', amount: 9 });
    f.addWeight('3', 9);
    d.receiveMessage('5', { command: 'transfer', amount: 9 });
    expect(d.getBalances()).toEqual({ 4: 9, 5: -9 });
    expect(e.getBalances()).toEqual({ 5: 9, 3: -9 });
    expect(f.getBalances()).toEqual({ 3: 9, 4: -9 });
    expect(graph.ourMessaging.sendMessage).toHaveBeenCalledWith('3', '4', {"amount": 9, "command": "transfer"});
    d.receiveMessage('2', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: ['0', '1'], backtracked: [] } });
    expect(graph.ourMessaging.sendMessage).toHaveBeenCalledWith('3', '4', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: ['0', '1', '2'], backtracked: [] } });
    d.receiveMessage('5', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: ['0', '1', '2', '3', '4'], backtracked: [] } }); // so the probe has P-looped as: a-b-c-[d-e-f-d]
    expect(graph.ourMessaging.sendMessage).toHaveBeenCalledWith('3', '5', { command: 'scout', probeId: 'probe-id', maxIncarnation: 0, amount: 9, debugInfo: { loop: ['3', '4', '5', '3']} });
  });
  it ('replies with nack if it is a leaf', () => {
    const graph = new Worker(0, 1);
    graph.ourMessaging = new Messaging(graph);
    graph.ourMessaging.sendMessage = jest.fn();
    const a = new Jerboa('0', graph);
    a.receiveMessage('x', { command: 'probe', probeId: 'probe-id', incarnation: 0, debugInfo: { path: [], backtracked: [] } });
    expect(graph.ourMessaging.sendMessage).toHaveBeenCalledWith('0', 'x', { command: 'nack', probeId: 'probe-id', incarnation: 0, debugInfo: { path: [], backtracked: []} });
  });
});