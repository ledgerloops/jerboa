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
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died ${code} ${signal}`);
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
    async function processDisbursement(obj: { from: string, to: string, weight: number }): Promise<number> {
      return stores.storeTransaction({ thisParty: obj.to, otherParty: null, amount: obj.weight });
    }
    async function processReclamation(obj: { from: string, to: string, weight: number }): Promise<number> {
      return stores.storeTransaction({ thisParty: obj.from, otherParty: null, amount: -obj.weight });
    }
    async function processStandard(obj: { from: string, to: string, weight: number }): Promise<number> {
      return stores.storeTransaction({ thisParty: obj.from, otherParty: obj.to, amount: -obj.weight });
    }
    async function processCredit(obj: { from: string, to: string, weight: number }): Promise<number> {
      return stores.storeTransaction({ thisParty: obj.to, otherParty: obj.from, amount: obj.weight });
    }
    
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
            result = await processDisbursement(obj);
            break;
          case '/RECLAMATION':
            result = await processReclamation(obj);
            break;
          case '/STANDARD':
            result = await processStandard(obj);
            await fetch('http://localhost:8000/credit', {
              method: 'POST',
              body: JSON.stringify(obj)
            });
            break;
          case '/credit':
            result = await processCredit(obj);
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