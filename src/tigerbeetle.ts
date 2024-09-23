import { CreateAccountError, createClient, CreateTransferError, id } from 'tigerbeetle-node';
import { Stores } from './stores.js';

export class TigerBeetleStores implements Stores {
    client;
    constructor() {
    }
    async ensureBalance(thisParty: number, otherParty: number): Promise<{ ledgerId: number, thisPartyId: bigint, otherPartyId: bigint}> {
      // `thisParty` is 1,2,3,... and is multiplied by 1,000,000 to create the ledgerId.
      // It is multiplied by 1,000,001 to create thisPartyId.
      // `otherParty` is 0,1,2,3,... (where 0 is the bank for DISBURSEMENT and RECLAMATION) and
      // it is likewise multiplied by 1,000,001 to create otherPartyId.
      // So for example a transfer from account 37 to account 54235 on the ledger of account 37 would have:
      // ledgerId: 37,000,000
      // thisPartyId: 37,000,037
      // otherPartyId: 37,054,235
      const ledgerId = thisParty;
      const thisPartyId = BigInt(1000 * 1000 * ledgerId) + BigInt(thisParty);
      const otherPartyId = BigInt(1000 * 1000 * ledgerId) + BigInt(otherParty);
      // console.log('creating accounts', ledgerId, thisPartyId, otherPartyId);
      const mainAccount = {
        id: thisPartyId,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: ledgerId,
        code: 1,
        flags: 0,
        timestamp: 0n,
      };
      const otherAccount = {
        id: otherPartyId,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: ledgerId,
        code: 1,
        flags: 0,
        timestamp: 0n,
      };
      
      const accountErrors: { index: number, result: number}[] = await this.client.createAccounts([mainAccount, otherAccount]);
      accountErrors.forEach(({ index, result }: { index: number, result: number})  => {
        if (result !== CreateAccountError["exists"]) {
          throw new Error(`error creating TigerBeetle account ${index} ${CreateAccountError[result]}`);
        }
      });
      // console.log('account created', accountErrors, );
      return {
        ledgerId,
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
    async storeTransaction({ thisParty, otherParty, amount }: { thisParty: number, otherParty: number, amount: number }): Promise<number> {
      // console.log('storeTransaction', thisParty, otherParty, amount);
      const absAmount = Math.abs(amount);
      const firstChunk = Math.round(absAmount);
      const afterFirst = 1000 * 1000 * (absAmount - firstChunk);
      const secondChunk = Math.round(afterFirst);
      const afterSecond = 1000 * 1000 * (afterFirst - secondChunk);
      const lastChunk = Math.round(afterSecond);

      const scaledAmount =
        BigInt(firstChunk) * BigInt(1000 * 1000) * BigInt(1000 * 1000) +
        BigInt(secondChunk) * BigInt(1000 * 1000) +
        BigInt(lastChunk);

      const { ledgerId, thisPartyId, otherPartyId } = await this.ensureBalance(thisParty, otherParty);
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
        ledger: ledgerId,
        code: 720,
        flags: 0,
        timestamp: 0n,
      }];
      // console.log('creating transfer', debit_account_id, credit_account_id, ledgerId);
      const transferErrors = await this.client.createTransfers(transfers);
      if (transferErrors.length > 0) {
        console.log(thisParty, otherParty, amount, thisPartyId, debit_account_id, credit_account_id, scaledAmount, transferErrors.map(error => {
          return {
            index: error.index,
            result: CreateTransferError[error.result]
          }
        }));
      }
      return amount;
    }
    async logLedgers(): Promise<void> {
      const query_transfers = await this.client.queryTransfers({});
      console.log(query_transfers);
    }
  }