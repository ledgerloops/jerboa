import { Jerboa, ProbeMessage } from '../src/Jerboa.js';
import { Graph } from '../src/Graph.js';
import { Messaging } from '../src/Messaging.js';
// jest.mock('../src/Graph.js');
jest.mock('../src/Messaging.js');



describe('Jerboa', () => {
  it ('returns false if it cannot initiate a probe', () => {
    const graph = new Graph();
    const a = new Jerboa('a', graph);
    const result = a.startProbe('probe-id');
    expect(result).toEqual(false);
  });
  it ('initiates a probe if it can', () => {
    const graph = new Graph();
    graph.messaging = new Messaging(graph);
    graph.messaging.sendMessage = jest.fn();
    const a = new Jerboa('a', graph);
    a.addWeight('b', 9);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', {"amount": 9, "command": "transfer"});
    const result = a.startProbe('probe-id');
    expect(result).toEqual(true);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', { command: 'probe', probeId: 'probe-id', debugInfo: {"path":[],"backtracked":[]} });
  });
  it('forwards a probe if it can', () => {
    const graph = new Graph();
    graph.messaging = new Messaging(graph);
    graph.messaging.sendMessage = jest.fn();
    const a = new Jerboa('a', graph);
    a.addWeight('b', 9);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', {"amount": 9, "command": "transfer"});
    a.receiveMessage('x', { command: 'probe', probeId: '1', debugInfo: { path: ['b', 'c'], backtracked: [] } } as ProbeMessage);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', { command: 'probe', probeId: '1', debugInfo: { path: ['b', 'c', 'x'], backtracked: []} });
  });
  it('splices off a loop if it can', () => {
    const graph = new Graph();
    graph.messaging = new Messaging(graph);
    graph.messaging.sendMessage = jest.fn();
    const d = new Jerboa('d', graph);
    d.addWeight('e', 9);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('d', 'e', {"amount": 9, "command": "transfer"});
    d.receiveMessage('c', { command: 'probe', probeId: 'probe-id', debugInfo: { path: ['a', 'b'], backtracked: [] } });
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('d', 'e', { command: 'probe', probeId: 'probe-id', debugInfo: { path: ['a', 'b', 'c'], backtracked: [] } });
    d.receiveMessage('f', { command: 'probe', probeId: 'probe-id', debugInfo: { path: ['a', 'b', 'c', 'd', 'e'], backtracked: [] } }); // so the probe has P-looped as: a-b-c-[d-e-f-d]
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('d', 'f', { command: 'scout', probeId: 'probe-id', amount: 0, debugInfo: { loop: ['d', 'e', 'f', 'd']} });
  });
  it ('replies with nack if it is a leaf', () => {
    const graph = new Graph();
    graph.messaging = new Messaging(graph);
    graph.messaging.sendMessage = jest.fn();
    const a = new Jerboa('a', graph);
    a.receiveMessage('x', { command: 'probe', probeId: 'probe-id', debugInfo: { path: [], backtracked: [] } });
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'x', { command: 'nack', probeId: 'probe-id', debugInfo: { path: [], backtracked: []} });
  });
});