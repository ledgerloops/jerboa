export class Balances {
    private balance: {
      [to: string]: number;
    } = {};
    private counterBalance: {
      [to: string]: number;
    } = {};
    private ensureBalance(to: string): void {
      // console.log('ensuring balance', to, this.balance);
      if (typeof this.balance[to] === 'undefined') {
        this.balance[to] = 0;
      }
    }
    private ensureCounterBalance(to: string): void {
      // console.log('ensuring balance', to, this.balance);
      if (typeof this.counterBalance[to] === 'undefined') {
        this.counterBalance[to] = 0;
      }
    }
    adjustBalance(to: string, amount: number): void {
      if (typeof to !== 'string') {
        throw new Error('adjustBalance argument to is not a string');
      }
      if (typeof amount !== 'number') {
        throw new Error('adjustBalance argument amount is not a number');
      }
      this.ensureBalance(to);
      // console.log('adding', this.balance[to], amount);
      this.balance[to] += amount;
      if (this.balance[to] === 0) {
        delete this.balance[to];
      }
      if (this.balance[to] === Infinity) {
        throw new Error('Infinity balance detected');
      }
    }
    adjustCounterBalance(to: string, amount: number): void {
      if (typeof to !== 'string') {
        throw new Error('adjustCounterBalance argument to is not a string');
      }
      if (typeof amount !== 'number') {
        throw new Error('adjustCounterBalance argument amount is not a number');
      }
      this.ensureCounterBalance(to);
      // console.log('adding', this.counterBalance[to], amount);
      this.counterBalance[to] += amount;
      if (this.counterBalance[to] === 0) {
        delete this.counterBalance[to];
      }

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
    getBalance(to: string): number | undefined {
      if (typeof to !== 'string') {
        throw new Error('getBalance argument to is not a string');
      }
      if (this.balance[to] === Infinity) {
        throw new Error('Infinity balance detected');
      }
      return this.balance[to];
    }
    getCounterBalance(to: string): number | undefined {
      return this.counterBalance[to];
    }
    // @returns number amount removed
    zeroOut(to: string): number {
      if (typeof to !== 'string') {
        throw new Error('adjustCounterBalance argument to is not a string');
      }
      const amount = this.getBalance(to);
      if (typeof amount === 'undefined') {
        return 0;
      }
      delete this.balance[to];
      return amount;
    }
    getOutgoingLinks(): string[] {
      return Object.keys(this.balance);
    }
  }