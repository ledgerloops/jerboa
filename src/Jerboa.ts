export class Jerboa {
  private balance: {
    [to: string]: number;
  } = {};
  ensureBalance(to: string) {
    if (typeof this.balance[to] === 'undefined') {
      this.balance[to] = 0;
    }
  }
  addWeight(to: string, weight: number): void {
    this.ensureBalance(to);
    this.balance[to] += weight;
  }
  getBalance(to: string): number {
    return this.balance[to];
  }
  deleteBalance(to: string) {
    delete this.balance[to];
  }
  getOutgoingLinks() {
    return Object.keys(this.balance);
  }
  getBalances() {
    return this.balance;
  }
}