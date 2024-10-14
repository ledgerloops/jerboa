import { Balances } from "./Balances.js";
import { Message, TransferMessage, ProbeMessage } from "./MessageTypes.js";


export class Jerboa {
  private balances: Balances = new Balances();
  private name: string;
  private probes: {
    [id: string]: {
      receivedFrom: string[];
      sentTo: string[];
    }
  } = {};
  private sendMessage: (to: string, message: Message) => void;
  constructor(name: string, sendMessage: (to: string, message: Message) => void) {
    this.name = name;
    this.sendMessage = sendMessage;
  }
  receiveTransfer(sender: string, msg: TransferMessage): void {
    // console.log(`received ${sender}->${this.name}: ${msg.amount}`);
    this.balances.adjustReceived(sender, msg.amount);
  }
  receiveProbe(sender: string, msg: ProbeMessage): void {
    if (typeof this.probes[msg.probeId] === 'undefined') {
      this.probes[msg.probeId] = { receivedFrom: [], sentTo: [] };
    }
    this.probes[msg.probeId].receivedFrom.push(sender);
    console.log(`Received probe`, sender, msg);
  }
  addWeight(to: string, amount: number): void {
    // console.log(`sending ${this.name}->${to}: ${amount}`);
    this.balances.adjustSent(to, amount);
    this.sendMessage(to, { command: 'transfer', amount } as TransferMessage);
    this.work();
  }
  receiveMessage(from: string, msg: Message ): void {
    // console.log('Jerboa receiveMessage', from, this.name, msg);
    switch((msg as { command: string }).command) {
    case 'transfer': {
      return this.receiveTransfer(from, msg as TransferMessage);
    }
    case 'probe': {
      return this.receiveProbe(from, msg as ProbeMessage);
    }
    default:
      console.log(from, this.name, msg);
      throw new Error('unknown command');
    }
  }
  async work(): Promise<void> {
    const balances = this.balances.getBalances();
    let havePos = false;
    let haveNeg = false;
    let randomPosFriend;
    Object.keys(balances).forEach((friend: string) => {
      if (balances[friend] > 0) {
        havePos = true;
        randomPosFriend = friend;
      }
      if (balances[friend] < 0) {
        haveNeg = true;
      }
    })
    if (havePos && haveNeg) {
      console.log(this.name, balances);
      this.sendMessage(randomPosFriend, { command: 'probe', probeId: `probe-from-${this.name}` } as ProbeMessage );
    }
  }
  getBalanceStats(): void {
    if (this.balances.haveSent() && this.balances.haveReceived()) {
      const balances = this.balances.getBalances();
      let havePos = false;
      let haveNeg = false;
      Object.keys(balances).forEach((friend: string) => {
        if (balances[friend] > 0) {
          havePos = true;
        }
        if (balances[friend] < 0) {
          haveNeg = true;
        }
      })
      if (havePos && haveNeg) {
        console.log(this.name, balances);
      }
    }
  }
}