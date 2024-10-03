import { Worker } from './Worker.js';

const NUM_WORKERS = 1;

export class DLD {
  private workers: Worker[] = [];
  constructor() {
    for (let i = 0; i < NUM_WORKERS; i++) {
      // console.log(`Instantiating worker ${i} of ${NUM_WORKERS}`);
      this.workers[i] = new Worker(i, NUM_WORKERS);
    }
  }
  // removes dead ends as it finds them.
  // nets loops as it finds them.
  runWorm(): number {
    let done = false;
    let probeId = 0;
    do {
      let newStep: string;
      probeId++;
      // console.log('starting probe', probeId);
      try {
        newStep = this.workers[probeId % NUM_WORKERS].getOurFirstNode(true);
        // console.log('picked first new step!', newStep, this.graph.getNode(newStep).getOutgoingLinks());
      } catch (e) {
        if ((e.message === 'Graph is empty') || (e.message == 'no nodes have outgoing links')) {
          done = true;
          return probeId;
        } else {;
          throw e;
        }
      }
      this.workers[parseInt(newStep) % NUM_WORKERS].getNode(newStep).startProbe(probeId.toString());
      // console.log('running probe from', newStep);
      this.runAllTasks();
    } while (!done);
    return probeId;
  }
  getWorker(nodeNo: number): Worker {
    return this.workers[nodeNo % NUM_WORKERS];
  }
  runAllTasks(): void {
    let hadWorkToDo: boolean;
    // console.log('running all tasks');
    do {
      hadWorkToDo = false;
      for (let i = 0; i < NUM_WORKERS; i++) {
        if (this.workers[i].runTasks()) {
          // console.log('had work to do in worker', i);
          hadWorkToDo = true;
        }
      }
    } while (hadWorkToDo);
  }
}