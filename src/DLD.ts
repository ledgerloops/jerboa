import { Graph } from './Graph.js';

export class DLD {
  tasks: string[] = [];
  graph: Graph = new Graph();
  addTransfer(from: string, to: string, amount: number): void {
    this.graph.addWeight(from, to, amount);
  }

  // removes dead ends as it finds them.
  // nets loops as it finds them.
  runWorm(): void {
    let done = false;
    do {
      let newStep: string;
      try {
        newStep = this.graph.getFirstNode(true);
        // console.log('picked first new step!', newStep, this.graph.getNode(newStep).getOutgoingLinks());
      } catch (e) {
        if ((e.message === 'Graph is empty') || (e.message == 'no nodes have outgoing links')) {
          done = true;
          return;
        } else {
          throw e;
        }
      }
      this.graph.messaging.sendMessage('out of nowhere', newStep, ['probe', `[]`]);
      this.graph.messaging.runTasks();
    } while (!done);
  }
}