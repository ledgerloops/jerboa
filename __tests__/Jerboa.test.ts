import { Jerboa } from '../src/Jerboa.js';
import { Graph } from '../src/Graph.js';
import { Messaging } from '../src/Messaging.js';
// jest.mock('../src/Graph.js');
jest.mock('../src/Messaging.js');



describe('Jerboa', () => {
  it ('returns false if it cannot initiate a probe', () => {
    const graph = new Graph();
    const a = new Jerboa('a', graph);
    const result = a.startProbe();
    expect(result).toEqual(false);
  });
  it ('initiates a probe if it can', () => {
    const graph = new Graph();
    graph.messaging = new Messaging(graph);
    graph.messaging.sendMessage = jest.fn();
    const a = new Jerboa('a', graph);
    a.addWeight('b', 9);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', ['transfer', '9']);
    const result = a.startProbe();
    expect(result).toEqual(true);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', ['probe', '1', '{"path":[],"backtracked":[]}']);
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
    const a = new Jerboa('a', graph);
    a.addWeight('b', 9);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', ['transfer', '9']);
    a.receiveMessage('x', ['probe', '1', JSON.stringify({ path: ['b', 'c', 'a', 'd'], backtracked: [] })]); // so the loop is a-d-x-a and b-c-a is the old prefix
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'b', ['probe', '1', JSON.stringify({ path: ['b', 'c'], backtracked: []})]);
  });
  it ('replies with nack if it is a leaf', () => {
    const graph = new Graph();
    graph.messaging = new Messaging(graph);
    graph.messaging.sendMessage = jest.fn();
    const a = new Jerboa('a', graph);
    a.receiveMessage('x', ['probe', '1', '{"path":[],"backtracked":[]}']);
    expect(graph.messaging.sendMessage).toHaveBeenCalledWith('a', 'x', ['nack', JSON.stringify({ path: [], backtracked: []})]);
  });
});