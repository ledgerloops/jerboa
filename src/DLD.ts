import { Graph } from './Graph.js';

export class DLD {
  tasks: string[] = [];
  graph: Graph = new Graph();

  // removes dead ends as it finds them.
  // nets loops as it finds them.
  runWorm(): void {
    let done = false;
    let probeId = 0;
    do {
      let newStep: string;
      probeId++;
      try {
        newStep = this.graph.getFirstNode(true);
        // console.log('picked first new step!', newStep, this.graph.getNode(newStep).getOutgoingLinks());
      } catch (e) {
        if ((e.message === 'Graph is empty') || (e.message == 'no nodes have outgoing links')) {
          done = true;
          return;
        } else {;
          throw e;
        }
      }
      this.graph.getNode(newStep).startProbe(probeId.toString());
      this.graph.messaging.runTasks();
      // console.log('running probe from', newStep);
    } while (!done);
  }
}