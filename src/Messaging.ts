import { Worker } from "./Worker.js";
import { TransferMessage, ProbeMessage, NackMessage, ScoutMessage, ProposeMessage, CommitMessage } from "./Jerboa.js";

export class Messaging {
  messagesSent: number = 0;
  messages: { from: string, to: string, message: TransferMessage | ProbeMessage | NackMessage | ScoutMessage | ProposeMessage | CommitMessage }[] = [];
  graph: Worker;
  constructor(graph: Worker) {
    this.graph = graph;
  }
  deliverMessage(from: string, to: string, message: TransferMessage | ProbeMessage | NackMessage | ScoutMessage | ProposeMessage | CommitMessage): void {
    this.messagesSent++;
    // console.log('delivering message', from, to, message, this.messages.length);
    return this.graph.getNode(to).receiveMessage(from, message);
  }
  sendMessage(from: string, to: string, message: TransferMessage | ProbeMessage | NackMessage | ScoutMessage | ProposeMessage | CommitMessage): void {
    this.messages.push({from, to, message });
    // console.log('message queued', from, to, message, this.messages.length);
  }
  runTasks(): void {
    // console.log('running tasks', this.messages);
    while (this.messages.length > 0) {
      const { from, to, message } = this.messages.pop();
      this.deliverMessage(from, to, message);
    }
  }
}