import { createClient } from 'redis';

export class RedisStores {
  client;
  constructor() {
    this.client = createClient();

    this.client.on('error', err => console.log('Redis Client Error', err));

  }
  async connect(): Promise<void> {
   await this.client.connect();
  } 
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
  async storeTransaction({ thisParty, otherParty, amount }: { thisParty: number, otherParty: number, amount: number }): Promise<number> {
    // don't wait for this to finish:
    // console.log('storing transaction', thisParty, otherParty, amount);
    this.client.incrByFloat(`${thisParty}:${otherParty}`, amount);
    return amount;
  }
}