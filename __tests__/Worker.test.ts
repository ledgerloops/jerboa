import { Worker } from '../src/Worker.js';
import { Message } from '../src/Jerboa.js';

describe('addWeight', () => {
  it('adds a link', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    await worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
      '0': {
        '1': 3,
      },
      '1': {
        '0': -3,
      },
    });
  });
  it('refuses zero weight', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    expect(() => { worker.addWeight('0', '1', 0)}).toThrow();
  });
  it('adds another link', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    await worker.runTasks();
    worker.addWeight('0', '2', 5);
    await worker.runTasks();
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
  it('prepends a link to a path', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    await worker.runTasks();
    worker.addWeight('2', '0', 5);
    await worker.runTasks();
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
  it('nets a higher amount', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    await worker.runTasks();
    worker.addWeight('1', '0', 7);
    await worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
      '0': {
        '1': -4
      },
      '1': {
        '0': 4
      }
    });
  });
  it('nets a lower amount', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    await worker.runTasks();
    worker.addWeight('1', '0', 2);
    await worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
      '0': {
        '1': 1
      },
      '1': {
        '0': -1
      }
    });
  });
  it('nets an equal amount', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    await worker.runTasks();
    worker.addWeight('1', '0', 3);
    await worker.runTasks();
    expect(worker.getOurBalances()).toEqual({
      '0': {
      },
      '1': {
      }
    });
  });
});

describe('getFirstNode', () => {
  it('works when passing no after argument', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    await worker.runTasks();
    expect(worker.getOurFirstNode(false)).toEqual('0');
  });
  it('works when passing an after argument', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
   worker.addWeight('0', '1', 3);
    await worker.runTasks();
    expect(worker.getOurFirstNode(false, '0')).toEqual('1');
  });
});

describe('hasOutgoingLinks', () => {
  it('works in the positive case', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    await worker.runTasks();
    expect(worker.hasOutgoingLinks('0')).toEqual(true);
  });
  it('works in the negative case', async () => {
    const sendMessage = (from: string, to: string, message: Message): void => {
      worker.deliverMessageToNodeInThisWorker(from, to, message);
    };
    const worker = new Worker(0, 1, sendMessage);
    worker.addWeight('0', '1', 3);
    await worker.runTasks();
    expect(worker.hasOutgoingLinks('1')).toEqual(false);
    expect(worker.hasOutgoingLinks('2')).toEqual(false);
  });
});
