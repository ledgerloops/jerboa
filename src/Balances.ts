export class Balances {
    private balance: {
      [to: string]: number;
    } = {};
    private counterBalance: {
      [to: string]: number;
    } = {};
    adjustBalance(to: string, amount: number): void {
      this.ensureBalance(to);
      this.balance[to] += amount;
    }
    adjustCounterBalance(to: string, amount: number): void {
      this.ensureCounterBalance(to);
      this.balance[to] += amount;
    }
    getBalances(): { [to: string]: number } {
      return this.balance;
    }
    sanityCheck(name: string): void {
      Object.keys(this.balance).forEach((other: string) => {
        if (this.balance[other] === 0) {
          throw new Error('why was this balance entry not deleted?');
        }
        if (this.counterBalance[other] === 0) {
          throw new Error('why was this counterBalance entry not deleted?');
        }
        if (this.balance[other] < 0) {
          throw new Error('why is this balance negative?');
        }
        if (this.counterBalance[other] < 0) {
          throw new Error('why is this counterBalance negative?');
        }
        if ((typeof this.balance[other] !== 'undefined') && (typeof this.counterBalance[other] !== 'undefined')) {
          console.log('why wasnt this trustline cleared bilaterally', name, other, this.balance[other], this.counterBalance[other]);
        }
      });
    }
    ensureBalance(to: string): void {
      // console.log('ensuring balance', to, this.balance);
      if (typeof this.balance[to] === 'undefined') {
        this.balance[to] = 0;
      }
    }
  
    ensureCounterBalance(to: string): void {
      // console.log('ensuring balance', to, this.balance);
      if (typeof this.counterBalance[to] === 'undefined') {
        this.counterBalance[to] = 0;
      }
    }
    getBalance(to: string): number | undefined {
      return this.balance[to];
    }
    getCounterBalance(to: string): number | undefined {
      return this.counterBalance[to];
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
  }