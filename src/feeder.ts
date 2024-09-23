
import { readFileSync } from 'fs';
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';
import process from 'node:process';


const numCPUs = availableParallelism() * (parseFloat(process.env.TURBO) || 1);
const TESTNET_CSV = '../strategy-pit/__tests__/fixtures/testnet-sarafu.csv';
// const TESTNET_CSV = './testnet-sarafu-first-10k.csv';

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running, forking ${numCPUs} threads`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({ CHUNK: i });
  }
  cluster.on('online', worker => {
   console.info(`worker process ${worker.process.pid} is online`)
  })
  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} exited ${code} ${signal}`);
  });
} else {
  let cumm = 0;
  const mod = parseInt(process.env.CHUNK);
  console.log(`Worker ${process.pid} started for chunk ${mod}`);
  console.log("Feeding the server...");
  const data = readFileSync(TESTNET_CSV, 'utf8')
  const lines = data.split('\n').map(line => {
    const [ fromStr, toStr, amountStr ] = line.split(' ')
    return {
      from: parseInt(fromStr),
      to: parseInt(toStr),
      amount: parseFloat(amountStr)
    };
  }).filter(obj => !isNaN(obj.from) && !isNaN(obj.to) && !isNaN(obj.amount));
  for (let lineNo = mod; lineNo < lines.length; lineNo += numCPUs) {
    // console.log(process.pid, lines[lineNo]);
    let cmd;
    if (lines[lineNo].from === 0) {
      cmd = 'DISBURSEMENT';
    } else if (lines[lineNo].to === 0) {
      cmd = 'RECLAMATION';
    } else {
      cmd = 'STANDARD';
    }
    const result = await fetch(`http://localhost:8000/${cmd}`, {
      method: 'POST',
      body: JSON.stringify(lines[lineNo])
    });
    cumm += parseFloat(await result.text());
  }
  console.log(`Worker ${process.pid} done ${cumm}`);
  process.exit();
}