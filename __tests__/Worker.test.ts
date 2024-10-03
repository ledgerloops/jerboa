import { Worker } from '../src/Worker.js';

describe('addWeight', () => {
  it('adds a link', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    expect(graph.getOurBalances()).toEqual({
      '0': {
        '1': 3,
      },
      '1': {
        '0': -3,
      },
    });
  });
  it('refuses zero weight', () => {
    const graph = new Worker(0, 1);
    expect(() => { graph.addWeight('0', '1', 0)}).toThrow();
  });
  it('adds another link', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    graph.addWeight('0', '2', 5);
    graph.ourMessaging.runTasks();
    expect(graph.getOurBalances()).toEqual({
      '0': {
        '1': 3,
        '2': 5,
      },
      '1': {
        '0': -3,
      },
      '2': {
        '0': -5,
      },
    });
  });
  it('prepends a link to a path', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    graph.addWeight('2', '0', 5);
    graph.ourMessaging.runTasks();
    expect(graph.getOurBalances()).toEqual({
      '0': {
        '1': 3,
        '2': -5,
      },
      '1': {
        '0': -3,
      },
      '2': {
        '0': 5
      }
    });
  });
  it('nets a higher amount', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    graph.addWeight('1', '0', 7);
    graph.ourMessaging.runTasks();
    expect(graph.getOurBalances()).toEqual({
      '0': {
        '1': -4
      },
      '1': {
        '0': 4
      }
    });
  });
  it('nets a lower amount', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    graph.addWeight('1', '0', 2);
    graph.ourMessaging.runTasks();
    expect(graph.getOurBalances()).toEqual({
      '0': {
        '1': 1
      },
      '1': {
        '0': -1
      }
    });
  });
  it('nets an equal amount', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    graph.addWeight('1', '0', 3);
    graph.ourMessaging.runTasks();
    expect(graph.getOurBalances()).toEqual({
      '0': {
      },
      '1': {
      }
    });
  });
});

describe('getFirstNode', () => {
  it('works when passing no after argument', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    expect(graph.getOurFirstNode(false)).toEqual('0');
  });
  it('works when passing an after argument', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    expect(graph.getOurFirstNode(false, '0')).toEqual('1');
  });
});

describe('hasOutgoingLinks', () => {
  it('works in the positive case', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    expect(graph.hasOutgoingLinks('0')).toEqual(true);
  });
  it('works in the negative case', () => {
    const graph = new Worker(0, 1);
    graph.addWeight('0', '1', 3);
    graph.ourMessaging.runTasks();
    expect(graph.hasOutgoingLinks('1')).toEqual(false);
    expect(graph.hasOutgoingLinks('2')).toEqual(false);
  });
});
