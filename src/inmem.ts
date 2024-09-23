export class InMemStores {
  balances: {
    [thisNode: string]: {
      [otherNode: string]: number
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
  async storeTransaction({ thisParty, otherParty, amount }: { thisParty: number, otherParty: number, amount: number }): Promise<number> {
    this.ensureBalance(thisParty, otherParty);
    this.balances[thisParty][otherParty] += amount;
    return this.balances[thisParty][otherParty];
  }
}