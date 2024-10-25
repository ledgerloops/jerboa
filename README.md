# Prototype only
# Not Suitable for Production Use

![jerboa](./jerboa.jpg)

This repository contains a prototype of LedgerLoops, for demonstration purposes.

It uses peer-to-peer messaging, [Decentralized Cycle Detection](https://datatracker.ietf.org/doc/draft-dejong-decentralized-cycle-detection/), and [hashlocks](https://ledgerloops.com/description), and a centralised [Semaphore Service](https://github.com/ledgerloops/jerboa/blob/main/src/SemaphoreService.ts) to successfully clear obligations in a network setting.

NB: this prototype [still uses a centralised semaphore service](https://github.com/ledgerloops/jerboa/issues/57) - an issue we hope to resolve in Q1/Q2 of 2025.

## Sarafu-Based Netting Challenge
To test its performance, we have used the [Sarafu-Based Netting Challenge](https://github.com/ledgerloops/strategy-pit?tab=readme-ov-file#sarafu-based-netting-challenge), as follows:
```
git clone https://github.com/ledgerloops/strategy-pit
git clone https://github.com/ledgerloops/jerboa
cd jerboa
npm install
npm run build
NUM_WORKERS=20 time node build/src/jerboaChallenge.js __tests__/fixtures/sarafu-50k.csv __tests__/fixtures/sarafu-50k.solution
```
This will take roughly 6 minutes, depending on your laptop. Taking into account that this simulates the entire network of about 7,000 nodes over 18 months, we believe this processing time to be acceptable.

```
cd ../strategy-pit
npm run build
python -m pip install ortools
node ./build/src/sarafu-to-debt.js ../jerboa/__tests__/fixtures/sarafu-50k.csv ./debt.csv ./sources.csv ./drains.csv 1000000
python mcf.py > flow.csv
node build/src/subtractFlow.js ./debt.csv ./flow.csv ./mcf-out.csv
node build/src/dfs.js debt.csv dfs.csv
node build/src/dfs.js mcf-out.csv mcf-dfs.csv
node ./build/src/analyse-sarafu-challenge-solution.js ./debt.csv ./mcf-dfs.csv
node ./build/src/analyse-sarafu-challenge-solution.js ./debt.csv ./dfs.csv
node ./build/src/analyse-sarafu-challenge-solution.js ./debt.csv ../jerboa/__tests__fixtures/sarafu-50k.solution
```
The last three lines will show you the performance of Min-Cost-Flow, Dept-First Search, and Jerboa (this prototype).
* Min-Cost-Flow will show a performance of roughly 18.9%, the optimum.
* Depth-First Search will show a performance of roughly 16.6%, a close second, but still a centralised algorithm.
* Jerboa will show our prototype's performance of roughly 15.5%

So this prototype achieves 80% of the optimum total amount of obligation cleared, which we believe is encouraging performance for a prototype.
