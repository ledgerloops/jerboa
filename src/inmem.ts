import { Stores } from "./stores.js";

export class InMemStores implements Stores {
  balances: {
    [thisNode: number]: {
      [otherNode: number]: number
    }
  };
  constructor() {
    this.balances = {};
  }
  ensureBalance(thisParty: number, otherParty: number): void {
    if (typeof this.balances[thisParty] === 'undefined') {
        this.balances[thisParty] = {};
    }
    if (typeof this.balances[thisParty][otherParty] === 'undefined') {
        this.balances[thisParty][otherParty] = 0.0;
    }
  }
  async connect(): Promise<void> {
    // noop
  } 
  async disconnect(): Promise<void> {
    // noop
  }
  // async storeTransaction({ txid, thisParty, otherParty, amount }: { txid: number, thisParty: number, otherParty: number, amount: number }): Promise<void> {
  async storeTransaction({ thisParty, otherParty, amount }: { thisParty: number, otherParty: number, amount: number }): Promise<void> {
      this.ensureBalance(thisParty, otherParty);
    this.balances[thisParty][otherParty] += amount;
    // return this.balances[thisParty][otherParty];
  }
  async logLedgers(): Promise<string> {
    console.log(this.balances);
    return 'Balances logged to server stdout';
  }
  async getBalances(): Promise<{
    [nodeNo: number]: {
      [neighbour: number]: number
    }
  }> {
    return this.balances;
  }

  async getTransactionIds(): Promise<string> {
    return '';
  }
}