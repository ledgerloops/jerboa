import cluster from 'node:cluster';
import http from 'node:http';
import { availableParallelism } from 'node:os';
import process from 'node:process';
import { RedisStores } from './redis.js';
import { InMemStores } from './inmem.js';
import { TigerBeetleStores } from './tigerbeetle.js';
import { LoopsFinder } from './LoopsFinder.js';

const numCPUs = availableParallelism() * (parseFloat(process.env.TURBO) || 1);

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running, forking ${numCPUs} threads`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({ WORKER: i });
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} done ${code} ${signal}`);
  });
  setTimeout(() => {
    setInterval(() => {
      console.log();
    }, 10000);
  }, 1000);
} else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  let stores;
  switch(process.env.STORE) {
    case 'redis':
      stores = new RedisStores();
      break;
    case 'tigerbeetle':
      stores = new TigerBeetleStores();
      break;
    default:
      stores = new InMemStores();
  }
  const loopsFinder = new LoopsFinder(stores);
  stores.connect().then(() => {
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
    http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', async () => {
        const obj = JSON.parse(body);
        let result;
        switch (req.url) {
          case '/DISBURSEMENT':
            // don't wait for this to complete:
            runningThisWorker.disbursement++;
            stores.storeTransaction({ txid: obj.txid, thisParty: obj.to, otherParty: 0, amount: obj.amount }).then(() => {
              successThisWorker.disbursement++;
              runningThisWorker.disbursement--;
            }).catch(() => {
              backgroundFailThisWorker.disbursement++;
              runningThisWorker.disbursement--;
            });
            result = 'accepted';
            break;
          case '/RECLAMATION':
            // don't wait for this to complete:
            runningThisWorker.reclamation++;
            stores.storeTransaction({ txid: obj.txid, thisParty: obj.from, otherParty: 0, amount: -obj.amount }).then(() => {
              successThisWorker.reclamation++;
              runningThisWorker.reclamation--;
            }).catch(() => {
              backgroundFailThisWorker.reclamation++;
              runningThisWorker.reclamation--;
            });
            result = 'accepted';
            break;
          case '/STANDARD':
            // don't wait for this to complete:
            runningThisWorker.standard++;
            stores.storeTransaction({ txid: obj.txid, thisParty: obj.from, otherParty: obj.to, amount: -obj.amount }).then(() => {
              successThisWorker.standard++;
              runningThisWorker.standard--;
            }).catch(() => {
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
            }).catch(() => {
              backgroundFailThisWorker.remoteCredit++;
              runningThisWorker.remoteCredit--;
            });
            result = 'accepted';
            break;
          case '/credit':
            runningThisWorker.credit++;
            result = await stores.storeTransaction({ txid: 0, thisParty: obj.to, otherParty: obj.from, amount: obj.amount });
            runningThisWorker.credit--;
            break;
          case '/report':
            result = await loopsFinder.report();
            break;
          default:
            console.error('Unknown command', req.url);
          }
        res.writeHead(200);
        res.end(`${result}\n`);
      });
    }).listen(8000);
    setInterval(() => {
      console.log(process.env.WORKER,
        'running',
        runningThisWorker.disbursement,
        runningThisWorker.reclamation,
        runningThisWorker.standard,
        runningThisWorker.remoteCredit,
        runningThisWorker.credit);
      console.log(process.env.WORKER, successThisWorker, backgroundFailThisWorker);
    }, 10000);
    console.log(`Worker ${process.pid} started with store '${process.env.STORE}'`);
  });
}