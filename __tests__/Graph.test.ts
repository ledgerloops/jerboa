import { Graph } from '../src/Graph.js';

describe('Graph', () => {
  it('adds a link', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    expect(graph.links).toEqual({
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
    expect(graph.links).toEqual({
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
    expect(graph.links).toEqual({
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
    expect(graph.links).toEqual({
      'b': {
        'a': 4
      }
    });
  });
  it('nets a lower amount', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.addWeight('b', 'a', 2);
    expect(graph.links).toEqual({
      'a': {
        'b': 1
      }
    });
  });
  it('nets an equal amount', () => {
    const graph = new Graph();
    graph.addWeight('a', 'b', 3);
    graph.addWeight('b', 'a', 3);
    expect(graph.links).toEqual({
    });
  });
});
