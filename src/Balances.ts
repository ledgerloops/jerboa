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

    getArchiveWeights(name: string): { [to: string]: number } {
      const ret = {};
      const friends = [... new Set(Object.keys(this.sent).concat(Object.keys(this.received)))];
      friends.forEach((friend: string) => {
        const sent = this.sent[friend] || 0;
        const received = this.received[friend] || 0;
        const sign = (sent === received ? (parseInt(name) > parseInt(friend) ? 1 : -1) : (sent > received ? 1 : -1));
        if ((sent > 0) && (received > 0)) {
          ret[friend] = sign * Math.min(sent, received);
          // console.log(name, friend, sent, received, 'setting pos', sign, Math.min(sent, received));
        } else if ((sent < 0) && (received < 0)) {
          ret[friend] = sign * Math.max(sent, received);
          // console.log(name, friend, sent, received, 'setting neg', sign, Math.max(sent, received));
        }
      });
      return ret;
    }
  }