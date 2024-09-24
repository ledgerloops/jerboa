import cluster from 'node:cluster';
import http from 'node:http';
import { availableParallelism } from 'node:os';
import process from 'node:process';
import { RedisStores } from './redis.js';
import { InMemStores } from './inmem.js';
import { TigerBeetleStores } from './tigerbeetle.js';

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
  stores.connect().then(() => {
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
            stores.storeTransaction({ thisParty: obj.to, otherParty: 0, amount: obj.amount });
            result = obj.amount;
            break;
          case '/RECLAMATION':
            // don't wait for this to complete:
            stores.storeTransaction({ thisParty: obj.from, otherParty: 0, amount: -obj.amount });
            result = obj.amount;
            break;
          case '/STANDARD':
            // don't wait for this to complete:
            stores.storeTransaction({ thisParty: obj.from, otherParty: obj.to, amount: -obj.amount });
            fetch('http://localhost:8000/credit', {
              method: 'POST',
              body: JSON.stringify(obj)
            });
            result = obj.amount;
            break;
          case '/credit':
            // don't wait for this to complete:
            stores.storeTransaction({ thisParty: obj.to, otherParty: obj.from, amount: obj.amount });
            result = obj.amount;
            break;
          case '/report':
            result = await stores.logLedgers();
            break;
          default:
            console.error('Unknown command', req.url);
          }
        res.writeHead(200);
        res.end(`${result}\n`);
      });
    }).listen(8000);
    
    console.log(`Worker ${process.pid} started with store '${process.env.STORE}'`);
  });
}