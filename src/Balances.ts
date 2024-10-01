export class Balances {
    private sent: {
      [to: string]: number;
    } = {};
    private received: {
      [to: string]: number;
    } = {};
    private ensureSent(to: string): void {
      if (typeof this.sent[to] === 'undefined') {
        this.sent[to] = 0;
      }
    }
    private ensureReceived(to: string): void {
      if (typeof this.received[to] === 'undefined') {
        this.received[to] = 0;
      }
    }
    adjustSent(to: string, amount: number): void {
      if (typeof to !== 'string') {
        throw new Error('adjustBalance argument to is not a string');
      }
      if (typeof amount !== 'number') {
        throw new Error('adjustBalance argument amount is not a number');
      }
      this.ensureSent(to);
      this.sent[to] += amount;
      if (this.sent[to] === 0) {
        delete this.sent[to];
      }
      if (this.sent[to] === Infinity) {
        throw new Error('Infinity balance detected');
      }
    }
    adjustReceived(to: string, amount: number): void {
      if (typeof to !== 'string') {
        throw new Error('adjustCounterBalance argument to is not a string');
      }
      if (typeof amount !== 'number') {
        throw new Error('adjustCounterBalance argument amount is not a number');
      }
      this.ensureReceived(to);
      // console.log('adding', this.counterBalance[to], amount);
      this.received[to] += amount;
      if (this.received[to] === 0) {
        delete this.received[to];
      }

    }
  
    sanityCheck(name: string): void {
      Object.keys(this.sent).forEach((other: string) => {
        if (this.sent[other] === 0) {
          throw new Error('why was this balance entry not deleted?');
        }
        if (this.received[other] === 0) {
          throw new Error('why was this counterBalance entry not deleted?');
        }
        if (this.sent[other] < 0) {
          console.log('why is this balance negative?', this.sent[other]);
        }
        if (this.received[other] < 0) {
          console.log('why is this counterBalance negative?', this.received[other]);
        }
        if ((typeof this.sent[other] !== 'undefined') && (typeof this.received[other] !== 'undefined')) {
          console.log('why wasnt this trustline cleared bilaterally', name, other, this.sent[other], this.received[other]);
        }
      });
    }
    getBalance(friend: string): number {
      const sent = this.sent[friend] || 0;
      const received = this.received[friend] || 0;
      return sent - received;
    }
    getBalances(): {
      [to: string]: number;
    } {
      const ret = {};
      const friends = [... new Set(Object.keys(this.sent).concat(Object.keys(this.received)))];
      friends.forEach((friend: string) => {
        const balance = this.getBalance(friend);
        if (balance !== 0) {
          ret[friend] = balance;
        }
      });
      return ret;
    }

  }