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
  async storeTransaction({ thisParty, otherParty, amount }: { thisParty: string, otherParty: string, amount: number }): Promise<number> {
    const newValueString = await this.client.incrByFloat(`${thisParty}:${otherParty}`, amount);
    // console.log('stored transaction', thisParty, otherParty, amount, newValueString);
    return parseFloat(newValueString);
  }
}