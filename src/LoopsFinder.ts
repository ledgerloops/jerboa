import { Stores } from "./stores.js";

export class LoopsFinder {
  stores: Stores;
  constructor(stores: Stores) {
    this.stores = stores;
  }
  async report(): Promise<string> {   
    return this.stores.getTransactionIds();
  }
}