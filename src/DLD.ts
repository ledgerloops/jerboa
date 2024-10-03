import { Worker } from './Worker.js';

export class DLD {
  private workers: Worker[] = [ new Worker() ];

  // removes dead ends as it finds them.
  // nets loops as it finds them.
  runWorm(): void {
    let done = false;
    let probeId = 0;
    do {
      let newStep: string;
      probeId++;
      try {
        newStep = this.workers[0].getFirstNode(true);
        // console.log('picked first new step!', newStep, this.graph.getNode(newStep).getOutgoingLinks());
      } catch (e) {
        if ((e.message === 'Graph is empty') || (e.message == 'no nodes have outgoing links')) {
          done = true;
          return;
        } else {;
          throw e;
        }
      }
      this.workers[0].getNode(newStep).startProbe(probeId.toString());
      this.workers[0].messaging.runTasks();
      // console.log('running probe from', newStep);
    } while (!done);
  }
  getWorker(): Worker {
    return this.workers[0];
  }
}