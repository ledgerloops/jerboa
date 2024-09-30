import { Graph } from './Graph.js';

export class DLD {
  tasks: string[] = [];
  graph: Graph = new Graph();
  addTransfer(from: string, to: string, amount: number): number {
    const amountNetted = this.graph.addWeight(from, to, amount);
    this.graph.report(2, amountNetted);
    return amountNetted;
  }
  



  executeTask(task: string): void {
    const parts = task.split(' ');
    // console.log('task string received', parts);
    switch(parts[0]) {
      case 'probe':
        return this.graph.getNode(parts[1]).receiveProbe(JSON.parse(parts[2]) as string[]);
      case 'nack':
        return this.graph.getNode(parts[1]).receiveNack(parts[2], JSON.parse(parts[3]) as string[]);
      default:
        throw new Error('unknown task');
    }
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
      this.graph.messaging.queueTask(['probe', newStep, `[]`]);
      this.graph.messaging.runTasks(this.executeTask.bind(this));
    } while (!done);
  }
}