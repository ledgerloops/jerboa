import { TigerBeetleStores } from './tigerbeetle.js';
import { ConnectivityMatrix } from './ConnectivityMatrix.js';

const stores = new TigerBeetleStores();
await stores.connect();
const connectivityMatrix = new ConnectivityMatrix();
let maxTimestampSeen = BigInt(0);
let newTimesFound;
let counter = 0;
do {
  newTimesFound = false;
  const transactions = await stores.replay(maxTimestampSeen);
  transactions.forEach(tx => {
    if ((tx.from !== 0) && (tx.to !== 0) && (tx.from !== tx.to)) {
      // console.log(`Adding txid ${tx.txid}: ${tx.from}->${tx.to}`);
      connectivityMatrix.addLink(tx.from.toString(), tx.to.toString());
    }
    counter++;
    if (counter % 100000 === 0) {
      console.log(`processed ${counter} transactions, up to txid ${tx.txid}`);
      connectivityMatrix.savePaths(`${counter}.txt`, true);
      // process.exit(0);
    }
    if (tx.timestamp > maxTimestampSeen) {
      newTimesFound = true;
      maxTimestampSeen = tx.timestamp;
    }
  });
} while(newTimesFound);
connectivityMatrix.savePaths(`${counter}.txt`, true);
connectivityMatrix.print();
// stores.disconnect();
process.exit(0);
