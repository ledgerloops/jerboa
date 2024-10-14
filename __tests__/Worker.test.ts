import { Worker } from '../src/Worker.js';
import { Message } from '../src/MessageTypes.js';

describe('addWeight', () => {
  it('adds a link', () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
      '0': {
        '1': 3,
      },
      '1': {
        '0': -3,
      },
    });
  });
  it('refuses zero weight', () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    expect(() => { worker.addWeight('0', '1', 0)}).toThrow();
  });
  it('adds another link', () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    worker.runTasks();
    worker.addWeight('0', '2', 5);
    worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
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
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    worker.runTasks();
    worker.addWeight('2', '0', 5);
    worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
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
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    worker.runTasks();
    worker.addWeight('1', '0', 7);
    worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
      '0': {
        '1': -4
      },
      '1': {
        '0': 4
      }
    });
  });
  it('nets a lower amount', () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    worker.runTasks();
    worker.addWeight('1', '0', 2);
    worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
      '0': {
        '1': 1
      },
      '1': {
        '0': -1
      }
    });
  });
  it('nets an equal amount', () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    worker.runTasks();
    worker.addWeight('1', '0', 3);
    worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
      '0': {
      },
      '1': {
      }
    });
  });
});

describe('getFirstNode', () => {
  it('works when passing no after argument', () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    worker.runTasks();
    expect(worker.getOurFirstNode(false)).toEqual('0');
  });
  it('works when passing an after argument', () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
   worker.addWeight('0', '1', 3);
    worker.runTasks();
    expect(worker.getOurFirstNode(false, '0')).toEqual('1');
  });
});

describe('hasOutgoingLinks', () => {
  it('works in the positive case', () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    worker.runTasks();
    expect(worker.hasOutgoingLinks('0')).toEqual(true);
  });
  it('works in the negative case', () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    worker.runTasks();
    expect(worker.hasOutgoingLinks('1')).toEqual(false);
    expect(worker.hasOutgoingLinks('2')).toEqual(false);
  });
});
