const bigIntMax = (...args): bigint => args.reduce((m: bigint, e: bigint) => e > m ? e : m);
const bigIntMin = (...args): bigint => args.reduce((m: bigint, e: bigint) => e < m ? e : m);

export class Balances {
  private sent: {
    [to: string]: bigint;
  } = {};
  private received: {
    [to: string]: bigint;
  } = {};
  private ensureSent(to: string): void {
    if (typeof this.sent[to] === 'undefined') {
      this.sent[to] = 0n;
    }
  }
  private ensureReceived(to: string): void {
    if (typeof this.received[to] === 'undefined') {
      this.received[to] = 0n;
    }
  }
  haveIncomingAndOutgoingLinks(): boolean {
    let haveIncoming = false;
    let haveOutgoing = false;

    const friends = [... new Set(Object.keys(this.sent).concat(Object.keys(this.received)))];
    for (let i = 0; i < friends.length; i++) {
      const sent = this.sent[friends[i]] || 0n;
      const received = this.received[friends[i]] || 0n;
      // console.log('considering friend', friends[i], sent, received);
      if ((sent - received) > 0n) {
        haveOutgoing = true;
      }
      if ((sent - received) < 0n) {
        haveIncoming = true;
      }
      if (haveIncoming && haveOutgoing) {
        return true;
      }
    }
    return false;
  }
  adjustSent(to: string, amount: bigint): void {
    if (typeof to !== 'string') {
      throw new Error('adjustBalance argument to is not a string');
    }
    if (typeof amount !== 'bigint') {
      throw new Error('adjustBalance argument amount is not a bigint');
    }
    this.ensureSent(to);
    this.sent[to] += amount;
    if (this.sent[to] === 0n) {
      delete this.sent[to];
    }
    // if (this.sent[to] === Infinity) {
    //   throw new Error('Infinity balance detected');
    // }
  }
  adjustReceived(to: string, amount: bigint): void {
    if (typeof to !== 'string') {
      throw new Error('adjustCounterBalance argument to is not a string');
    }
    if (typeof amount !== 'bigint') {
      throw new Error('adjustCounterBalance argument amount is not a bigint');
    }
    this.ensureReceived(to);
    // console.log('adding', this.counterBalance[to], amount);
    this.received[to] += amount;
    if (this.received[to] === 0n) {
      delete this.received[to];
    }
  }

  getBalance(friend: string): bigint {
    const sent = this.sent[friend] || 0n;
    const received = this.received[friend] || 0n;
    return sent - received;
  }
  getBalances(): {
    [to: string]: bigint;
  } {
    const ret = {};
    const friends = [... new Set(Object.keys(this.sent).concat(Object.keys(this.received)))];
    friends.forEach((friend: string) => {
      const balance = this.getBalance(friend);
      if (balance !== 0n) {
        ret[friend] = balance;
      }
    });
    return ret;
  }
  public getBilateralStats(): {
    num: number;
    amount: bigint;
  } {
    let num = 0;
    let amount = 0n;
    const friends = [... new Set(Object.keys(this.sent).concat(Object.keys(this.received)))];
    friends.forEach((friend: string) => {
      const sent = this.sent[friend] || 0n;
      const received = this.received[friend] || 0n;
      if ((sent > 0) && (received > 0)) {
        // console.log(`${name} has pos bilateral with ${friend}, min(${sent}, ${received}) = ${bigIntMin(sent, received)}`);
        num++;
        amount += bigIntMin(sent, received);
      } else if ((sent < 0) && (received < 0)) {
        // console.log(`${name} has neg bilateral with ${friend}, max(${sent}, ${received}) = ${bigIntMax(sent, received)}`);
        num++;
        amount += bigIntMax(sent, received);
      }
    });
    return {
      num,
      amount,
    };
  }
}
