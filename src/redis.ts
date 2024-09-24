import { createClient } from 'redis';
import { Stores } from './stores.js';

export class RedisStores implements Stores {
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
  // async storeTransaction({ txid, thisParty, otherParty, amount }: { txid: number, thisParty: number, otherParty: number, amount: number }): Promise<void> {
  async storeTransaction({ thisParty, otherParty, amount }: { thisParty: number, otherParty: number, amount: number }): Promise<void> {
      // console.log('storing transaction', thisParty, otherParty, amount);
    await this.client.incrByFloat(`${thisParty}:${otherParty}`, amount);
  }
  async logLedgers(): Promise<string> {
    return 'TODO: implement logLedgers in RedisStores';
  }
  async getBalances(): Promise<{
    [nodeNo: number]: {
      [neighbour: number]: number
    }
  }> {
    return {};
  }
  async getTransactionIds(): Promise<string> {
    return '';
  }
}