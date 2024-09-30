export class Jerboa {
  private balance: {
    [to: string]: number;
  } = {};
  ensureBalance(to: string): void {
    // console.log('ensuring balance', to, this.balance);
    if (typeof this.balance[to] === 'undefined') {
      this.balance[to] = 0;
    }
  }
  addWeight(to: string, weight: number): void {
    this.ensureBalance(to);
    this.balance[to] += weight;
  }
  getBalance(to: string): number | undefined {
    return this.balance[to];
  }
  // @returns number amount removed
  zeroOut(to: string): number {
    const amount = this.getBalance(to);
    delete this.balance[to];
    return amount;
  }
  getOutgoingLinks(): string[] {
    return Object.keys(this.balance);
  }
  getBalances(): { [to: string]: number } {
    return this.balance;
  }
}