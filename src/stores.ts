export interface Stores {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  storeTransaction({ thisParty, otherParty, amount }: { thisParty: number, otherParty: number, amount: number }): Promise<number>;
  logLedgers(): Promise<string>;
}