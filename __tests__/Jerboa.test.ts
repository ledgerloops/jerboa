import { Jerboa } from '../src/Jerboa.js';
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
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', ['transfer', '9']);
    const result = a.startProbe('probe-id');
    expect(result).toEqual(true);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', ['probe', 'probe-id', '{"path":[],"backtracked":[]}']);
  });
  it('forwards a probe if it can', () => {
    const graph = new Graph();
    graph.messaging = new Messaging(graph);
    graph.messaging.sendMessage = jest.fn();
    const a = new Jerboa('a', graph);
    a.addWeight('b', 9);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', ['transfer', '9']);
    a.receiveMessage('x', ['probe', '1', JSON.stringify({ path: ['b', 'c'], backtracked: [] })]);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', ['probe', '1', JSON.stringify({ path: ['b', 'c', 'x'], backtracked: []})]);
  });
  it('splices off a loop if it can', () => {
    const graph = new Graph();
    graph.messaging = new Messaging(graph);
    graph.messaging.sendMessage = jest.fn();
    const d = new Jerboa('d', graph);
    d.addWeight('e', 9);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('d', 'e', ['transfer', '9']);
    d.receiveMessage('c', ['probe', 'probe-id', JSON.stringify({ path: ['a', 'b'], backtracked: [] })]);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('d', 'e', ['probe', 'probe-id', JSON.stringify({ path: ['a', 'b', 'c'], backtracked: [] })]);
    d.receiveMessage('f', ['probe', 'probe-id', JSON.stringify({ path: ['a', 'b', 'c', 'd', 'e'], backtracked: [] })]); // so the probe has P-looped as: a-b-c-[d-e-f-d]
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('d', 'f', ['scout', 'probe-id', JSON.stringify(0), JSON.stringify({ loop: ['d', 'e', 'f', 'd']})]);
  });
  it ('replies with nack if it is a leaf', () => {
    const graph = new Graph();
    graph.messaging = new Messaging(graph);
    graph.messaging.sendMessage = jest.fn();
    const a = new Jerboa('a', graph);
    a.receiveMessage('x', ['probe', 'probe-id', '{"path":[],"backtracked":[]}']);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'x', ['nack', 'probe-id', JSON.stringify({ path: [], backtracked: []})]);
  });
});