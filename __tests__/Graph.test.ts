import { Graph } from '../src/Graph.js';

describe('addWeight', () => {
  it('adds a link', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.messaging.runTasks();
    expect(graph.getBalances()).toEqual({
      'a': {
        'b': 3,
      },
      'b': {
        'a': -3,
      },
    });
  });
  it('refuses zero weight', () => {
    const graph = new Graph();
    expect(() => { graph.addWeight('a', 'b', 0)}).toThrow();
  });
  it('adds another link', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.messaging.runTasks();
    graph.addWeight('a', 'c', 5);
    graph.messaging.runTasks();
    expect(graph.getBalances()).toEqual({
      'a': {
        'b': 3,
        'c': 5,
      },
      'b': {
        'a': -3,
      },
      'c': {
        'a': -5,
      },
    });
  });
  it('prepends a link to a path', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.messaging.runTasks();
    graph.addWeight('c', 'a', 5);
    graph.messaging.runTasks();
    expect(graph.getBalances()).toEqual({
      'a': {
        'b': 3,
        'c': -5,
      },
      'b': {
        'a': -3,
      },
      'c': {
        'a': 5
      }
    });
  });
  it('nets a higher amount', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.addWeight('b', 'a', 7);
    graph.messaging.runTasks();
    expect(graph.getBalances()).toEqual({
      'a': {
        'b': -4
      },
      'b': {
        'a': 4
      }
    });
  });
  it('nets a lower amount', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.addWeight('b', 'a', 2);
    graph.messaging.runTasks();
    expect(graph.getBalances()).toEqual({
      'a': {
        'b': 1
      },
      'b': {
        'a': -1
      }
    });
  });
  it('nets an equal amount', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.addWeight('b', 'a', 3);
    graph.messaging.runTasks();
    expect(graph.getBalances()).toEqual({
      'a': {
      },
      'b': {
      }
    });
  });
});

describe('getFirstNode', () => {
  it('works when passing no after argument', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.messaging.runTasks();
    expect(graph.getFirstNode(false)).toEqual('a');
  });
  it('works when passing an after argument', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.messaging.runTasks();
    expect(graph.getFirstNode(false, 'a')).toEqual('b');
  });
});

describe('hasOutgoingLinks', () => {
  it('works in the positive case', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.messaging.runTasks();
    expect(graph.hasOutgoingLinks('a')).toEqual(true);
  });
  it('works in the negative case', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.messaging.runTasks();
    expect(graph.hasOutgoingLinks('b')).toEqual(false);
    expect(graph.hasOutgoingLinks('c')).toEqual(false);
  });
});
