import { CreateAccountError, createClient, id } from 'tigerbeetle-node';

export class TigerBeetleStores {
    client;
    constructor() {
    }
    async ensureBalance(thisParty: string, otherParty: string): Promise<{ thisPartyId: bigint, otherPartyId: bigint}> {
      const thisPartyId = BigInt(isNaN(parseInt(thisParty)) ? 0 : parseInt(thisParty));
      const otherPartyId = BigInt(isNaN(parseInt(otherParty)) ? 0 : parseInt(otherParty));
      
      const id = BigInt(1000 * 1000) * thisPartyId + otherPartyId;
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
      
      const accountErrors: { index: number, result: number}[] = await this.client.createAccounts([account]);
      accountErrors.forEach(({ index, result }: { index: number, result: number})  => {
        if (result !== CreateAccountError["exists"]) {
          throw new Error(`error creating TigerBeetle account ${index} ${result}`);
        }
      });
      // console.log('account created', accountErrors, );
      return {
        thisPartyId,
        otherPartyId
      }
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
      const firstChunk = Math.round(Math.abs(amount));
      const afterFirst = 1000 * 1000 * (amount - firstChunk);
      const secondChunk = Math.round(afterFirst);
      const afterSecond = 1000 * 1000 * (afterFirst - secondChunk);
      const lastChunk = Math.round(afterSecond);

      const scaledAmount =
        BigInt(firstChunk) * BigInt(1000 * 1000) * BigInt(1000 * 1000) +
        BigInt(secondChunk) * BigInt(1000 * 1000) +
        BigInt(lastChunk);

      const { thisPartyId, otherPartyId } = await this.ensureBalance(thisParty, otherParty);
      // this.balances[thisParty][otherParty] += amount;
      let debit_account_id, credit_account_id;
      if (amount >= 0) {
        debit_account_id = thisPartyId;
        credit_account_id = otherPartyId;
      } else {
        debit_account_id = otherPartyId;
        credit_account_id = thisPartyId;
      }
      const transfers = [{
        id: id(),
        debit_account_id,
        credit_account_id,
        amount: scaledAmount,
        pending_id: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        timeout: 0,
        ledger: 1,
        code: 720,
        flags: 0,
        timestamp: 0n,
      }];
      const transferErrors = await this.client.createTransfers(transfers);
      console.log(transferErrors);
      return amount;
    }
  }