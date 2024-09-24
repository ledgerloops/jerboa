import { readFileSync } from 'fs';
import { TigerBeetleStores } from './tigerbeetle.js';
const TESTNET_CSV = './testnet-sarafu-first-10k.csv';

async function run(): Promise<void> {
  const successThisWorker = {
    disbursement: 0,
    reclamation: 0,
    standard: 0,
    remoteCredit: 0
  };
  const runningThisWorker = {
    disbursement: 0,
    reclamation: 0,
    standard: 0,
    remoteCredit: 0,
    credit: 0
  };
  const backgroundFailThisWorker = {
    disbursement: 0,
    reclamation: 0,
    standard: 0,
    remoteCredit: 0
  };
  const stores = new TigerBeetleStores();
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
      runningThisWorker.remoteCredit++;
      fetch('http://localhost:8000/credit', {
        method: 'POST',
        body: JSON.stringify(obj)
      }).then(() => {
        successThisWorker.remoteCredit++;
        runningThisWorker.remoteCredit--;
      }).catch((e) => {
        console.error(e.message);
        backgroundFailThisWorker.remoteCredit++;
        runningThisWorker.remoteCredit--;
      });
    }
  }
  setInterval(() => {
    console.log('success', successThisWorker);
    console.log('running', runningThisWorker);
    console.log('fail', backgroundFailThisWorker);
  }, 1000);
}

// ...
run();