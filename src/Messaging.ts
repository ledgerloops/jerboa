import { Graph } from "./Graph.js";

export class Messaging {
  messages: string[][] = [];
  graph: Graph;
  constructor(graph: Graph) {
    this.graph = graph;
  }
  deliverMessage(from: string, to: string, task: string): void {
    console.log('deliverMessage', from, to, task);
    const parts = task.split(' ');
    return this.graph.getNode(to).receiveMessage(from, parts);
  }
  sendMessage(from: string, to: string, task: string[]): void {
    this.messages.push([from, to, task.join(' ')]);
    // console.log('sendMessage', from, to, task);
  }
  runTasks(): void {
    // console.log('running tasks', this.messages);
    while (this.messages.length > 0) {
      const [from, to, task] = this.messages.pop();
      this.deliverMessage(from, to, task);
    }
  }
}