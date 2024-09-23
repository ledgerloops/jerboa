import { CreateAccountError, createClient } from 'tigerbeetle-node';

export class TigerBeetleStores {
    client;
    constructor() {
    }
    async ensureBalance(thisParty: string, otherParty: string): Promise<void> {
      const id = BigInt(1000 * 1000 * parseInt(thisParty) + parseInt(otherParty));
      const account = {
        id,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: parseInt(thisParty),
        code: 1,
        flags: 0,
        timestamp: 0n,
      };
      
      const accountErrors = await this.client.createAccounts([account]);
      console.log('account created', accountErrors, CreateAccountError["exists"]);
  }
    async connect(): Promise<void> {
      this.client = createClient({
        cluster_id: 0n,
        replica_addresses: [process.env.TB_ADDRESS || "3000"],
      });
      // noop
    } 
    async disconnect(): Promise<void> {
      // noop
  }
    async storeTransaction({ thisParty, otherParty, amount }: { thisParty: string, otherParty: string, amount: number }): Promise<number> {
      this.ensureBalance(thisParty, otherParty);
      // this.balances[thisParty][otherParty] += amount;
      return amount;
    }
  }