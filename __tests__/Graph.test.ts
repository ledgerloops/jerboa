import { Graph } from '../src/Graph.js';

describe('addWeight', () => {
  it('adds a link', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    expect(graph.getLinks()).toEqual({
      'a': {
        'b': 3
      }
    });
  });
  it('refuses zero weight', () => {
    const graph = new Graph();
    expect(() => { graph.addWeight('a', 'b', 0)}).toThrow();
  });
  it('refuses negative weight', () => {
    const graph = new Graph();
    expect(() => { graph.addWeight('a', 'b', -3)}).toThrow();
  });
  it('adds another link', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.addWeight('a', 'c', 5);
    expect(graph.getLinks()).toEqual({
      'a': {
        'b': 3,
        'c': 5
      }
    });
  });
  it('prepends a link to a path', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.addWeight('c', 'a', 5);
    expect(graph.getLinks()).toEqual({
      'a': {
        'b': 3
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
    expect(graph.getLinks()).toEqual({
      'b': {
        'a': 4
      }
    });
  });
  it('nets a lower amount', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.addWeight('b', 'a', 2);
    expect(graph.getLinks()).toEqual({
      'a': {
        'b': 1
      }
    });
  });
  it('nets an equal amount', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.addWeight('b', 'a', 3);
    expect(graph.getLinks()).toEqual({
    });
  });
});

describe('removeLink', () => {
  it('removes a link', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.removeLink('a', 'b');
    expect(graph.getLinks()).toEqual({});
  });
});

describe('getFirstNode', () => {
  it('works when passing no after argument', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    expect(graph.getFirstNode()).toEqual('a');
  });
  it('works when passing an after argument', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    expect(graph.getFirstNode('a')).toEqual('b');
  });
});

describe('hasOutgoingLinks', () => {
  it('works in the positive case', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    expect(graph.hasOutgoingLinks('a')).toEqual(true);
  });
  it('works in the negative case', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    expect(graph.hasOutgoingLinks('b')).toEqual(false);
    expect(graph.hasOutgoingLinks('c')).toEqual(false);
  });
});

describe('getWeight', () => {
  it('works in the positive case', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    expect(graph.getWeight('a', 'b')).toEqual(3);
  });
  it('works in the negative case', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    expect(graph.getWeight('b', 'a')).toEqual(0);
    expect(graph.getWeight('c', 'b')).toEqual(0);
  });
});