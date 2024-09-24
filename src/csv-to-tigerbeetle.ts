import { readFileSync } from 'fs';
import { TigerBeetleStores } from './tigerbeetle.js';
// const TESTNET_CSV = './testnet-sarafu-first-10k.csv';
const TESTNET_CSV = '../strategy-pit/__tests__/fixtures/testnet-sarafu.csv';

async function run(): Promise<void> {
  const successThisWorker = {
    disbursement: 0,
    reclamation: 0,
    standard: 0,
    credit: 0
  };
  const runningThisWorker = {
    disbursement: 0,
    reclamation: 0,
    standard: 0,
    credit: 0
  };
  const backgroundFailThisWorker = {
    disbursement: 0,
    reclamation: 0,
    standard: 0,
    credit: 0
  };
  const stores = new TigerBeetleStores();
  await stores.connect();
  const lines = readFileSync(TESTNET_CSV, 'utf8').split('\n');
  const transactions = [];
  for (let i = 0; i < lines.length; i++) {
    const [ fromStr, toStr, amountStr ] = lines[i].split(' ')
    const obj = {
      txid: i,
      from: parseInt(fromStr),
      to: parseInt(toStr),
      amount: parseFloat(amountStr)
    }
    if (!isNaN(obj.from) && !isNaN(obj.to) && !isNaN(obj.amount)) {
      transactions.push(obj);
    }
  }
  for (let transNo = 0; transNo < transactions.length; transNo++) {
    const obj = transactions[transNo];
    console.log(transNo, obj);
    if (obj.from === 0) {
      runningThisWorker.disbursement++;
      stores.storeTransaction({ txid: obj.txid, thisParty: obj.to, otherParty: 0, amount: obj.amount }).then(() => {
        successThisWorker.disbursement++;
        runningThisWorker.disbursement--;
      }).catch((e) => {
        console.error(e.message);
        backgroundFailThisWorker.disbursement++;
        runningThisWorker.disbursement--;
      });
    } else if (obj.to === 0) {
      runningThisWorker.reclamation++;
      stores.storeTransaction({ txid: obj.txid, thisParty: obj.from, otherParty: 0, amount: -obj.amount }).then(() => {
        successThisWorker.reclamation++;
        runningThisWorker.reclamation--;
      }).catch((e) => {
        console.error(e.message);
        backgroundFailThisWorker.reclamation++;
        runningThisWorker.reclamation--;
      });
    } else {
      runningThisWorker.standard++;
      stores.storeTransaction({ txid: obj.txid, thisParty: obj.from, otherParty: obj.to, amount: -obj.amount }).then(() => {
        successThisWorker.standard++;
        runningThisWorker.standard--;
      }).catch((e) => {
        console.error(e.message);
        backgroundFailThisWorker.standard++;
        runningThisWorker.standard--;
      });
      runningThisWorker.credit++;
      stores.storeTransaction({ txid: 0, thisParty: obj.to, otherParty: obj.from, amount: obj.amount }).then(() => {
        successThisWorker.credit++;
        runningThisWorker.credit--;
      }).catch((e) => {
        console.error(e.message);
        backgroundFailThisWorker.credit++;
        runningThisWorker.credit--;
      });
    }
  }
  setInterval(async () => {
    console.log('flushing');
    await (stores as TigerBeetleStores).flushTransfers();
    console.log('success', successThisWorker);
    console.log('running', runningThisWorker);
    console.log('fail', backgroundFailThisWorker);
    let done = true;
    Object.keys(runningThisWorker).forEach(key => {
      if (runningThisWorker[key] > 0)  {
        done = false;
      }
    });
    if (done) {
      console.log('done');
      process.exit(0);
    }
  }, 1000);
}

// ...
run();