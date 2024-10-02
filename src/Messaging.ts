import { Graph } from "./Graph.js";
import { TransferMessage, ProbeMessage, NackMessage, ScoutMessage, ProposeMessage, CommitMessage } from "./Jerboa.js";

export class Messaging {
  messagesSent: number = 0;
  messages: { from: string, to: string, message: TransferMessage | ProbeMessage | NackMessage | ScoutMessage | ProposeMessage | CommitMessage }[] = [];
  graph: Graph;
  constructor(graph: Graph) {
    this.graph = graph;
  }
  deliverMessage(from: string, to: string, message: TransferMessage | ProbeMessage | NackMessage | ScoutMessage | ProposeMessage | CommitMessage): void {
    this.messagesSent++;
    return this.graph.getNode(to).receiveMessage(from, message);
  }
  sendMessage(from: string, to: string, message: TransferMessage | ProbeMessage | NackMessage | ScoutMessage | ProposeMessage | CommitMessage): void {
    this.messages.push({from, to, message });
    // console.log('sendMessage', from, to, task);
  }
  runTasks(): void {
    // console.log('running tasks', this.messages);
    while (this.messages.length > 0) {
      const { from, to, message } = this.messages.pop();
      this.deliverMessage(from, to, message);
    }
  }
}