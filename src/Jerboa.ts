// import { randomBytes, createHash } from "node:crypto";
import { Balances } from "./Balances.js";
// const MIN_LOOP_WEIGHT = 0.00000001;
// const MAX_LOOP_WEIGHT = 1000000000;
// const RANDOM_NEXT_STEP = false;

// function randomStringFromArray(arr: string[]): string {
//   if (!Array.isArray(arr)) {
//     throw new Error('not an array!');
//   }
//   if (arr.length === 0) {
//     throw new Error('array is empty!');
//   }
//   if (RANDOM_NEXT_STEP) {
//     const pick = Math.floor(Math.random() * arr.length);
//     return arr[pick];
//   } else {
//     return arr[0];
//   }
// }
export type Message = 
 | TransferMessage
 | ProbeMessage
 | NackMessage
 | ScoutMessage
 | ProposeMessage
 | CommitMessage;

export type TransferMessage = {
  command: string,
  amount: number,
};
export type ProbeMessage = {
  command: string,
  probeId: string,
  incarnation: number,
  debugInfo: {
    path: string[],
    backtracked: string[],
  },
};
export type NackMessage = {
  command: string,
  probeId: string,
  incarnation: number,
  debugInfo: {
    path: string[],
    backtracked: string[],
  },
};
export type ScoutMessage = {
  command: string,
  probeId: string,
  maxIncarnation: number,
  amount: number,
  debugInfo: {
    loop: string[],
  },
};
export type ProposeMessage = {
  command: string,
  probeId: string,
  maxIncarnation: number,
  amount: number,
  hash: string,
  debugInfo: {
    loop: string[],
  },
};
export type CommitMessage = {
  command: string,
  probeId: string,
  amount: number,
  preimage: string,
  debugInfo: {
    loop: string[],
  },
};

export class Jerboa {
  private balances: Balances = new Balances();
  private name: string;
  private sendMessage: (to: string, message: Message) => void;
  constructor(name: string, sendMessage: (to: string, message: Message) => void) {
    this.name = name;
    this.sendMessage = sendMessage;
  }
  receiveTransfer(sender: string, msg: TransferMessage): void {
    console.log(`received ${sender}->${this.name}: ${msg.amount}`);
    this.balances.adjustReceived(sender, msg.amount);
  }
  addWeight(to: string, amount: number): void {
    console.log(`sending ${this.name}->${to}: ${amount}`);
    this.sendMessage(to, { command: 'transfer', amount } as TransferMessage);
  }
  receiveMessage(from: string, msg: Message ): void {
    // console.log('Jerboa receiveMessage', from, this.name, msg);
    switch((msg as { command: string }).command) {
    case 'transfer': {
      return this.receiveTransfer(from, msg as TransferMessage);
    }
    default:
      console.log(from, this.name, msg);
      throw new Error('unknown command');
    }
  }
}