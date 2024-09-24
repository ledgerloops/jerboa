export interface Stores {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  storeTransaction({ txid, thisParty, otherParty, amount }: { txid: number, thisParty: number, otherParty: number, amount: number }): Promise<void>;
  logLedgers(): Promise<string>;
  getBalances(): Promise<{
    [nodeNo: number]: {
      [neighbour: number]: number
    }
  }>;
  getTransactionIds(): Promise<string>;
}