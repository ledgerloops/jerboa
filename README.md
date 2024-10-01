# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Loops in Sarafu
The Sarafu dataset has 440k peer-to-peer transactions, and our Bird's Eye algorithm finds quite a few loops in that quite easily.
It uses a depth-first probe with backtracking. Links and nodes are actually removed from the network in the backtracking, maybe this is
what makes the algorithm so fast.
We're now working on making that same algorithm run with peer-to-peer `probe` messages (for the depth-first probe) and `nack` messages (for the backtracking).

```
npm install
npm test
npm run build
time node build/src/birdsEyeAnalysis.js __tests__/fixture-300000.csv
[...]
Graph has 0 nodes and 0 links left
After 422721 transactions with a total amount of 297 million
189 million (64%) was immediately netted bilaterally
And a further 65 million (22%) was netted in 26986 loops
Leaving 43 million (14%) to be settled out of band

real	0m22.982s
user	0m20.739s
sys	0m3.752s
```

## Development
The script became a lot slower in https://github.com/ledgerloops/jerboa/pull/12
Before, it was able to process all 400k transactions in 40-80 seconds,
now it takes 220 seconds:

```
npm install
npm test
npm run build
time node build/src/birdsEyeAnalysis.js __tests__/fixture-300.csv > birdseye-30.log
time node build/src/birdsEyeAnalysis.js __tests__/fixture-300.csv > birdseye-300.log
time node build/src/birdsEyeAnalysis.js __tests__/fixture-3000.csv > birdseye-3k.log
time node build/src/birdsEyeAnalysis.js __tests__/fixture-30000.csv > birdseye-30k.log
time node build/src/birdsEyeAnalysis.js __tests__/fixture-300000.csv > birdseye-300k.log

PROBING_REPORT=1 time node build/src/analysis.js __tests__/fixture-30.csv > jerboa-30.log
PROBING_REPORT=1 time node build/src/analysis.js __tests__/fixture-300.csv > jerboa-300.log
PROBING_REPORT=1 time node build/src/analysis.js __tests__/fixture-3000.csv > jerboa-3k.log
PROBING_REPORT=1 time node build/src/analysis.js __tests__/fixture-30000.csv > jerboa-30k.log
PROBING_REPORT=1 time node build/src/analysis.js __tests__/fixture-300000.csv > jerboa-300k.log

diff ./jerboa-30.log ./birdseye-30.log
diff ./jerboa-300.log ./birdseye-300.log
diff ./jerboa-3k.log ./birdseye-3k.log
diff ./jerboa-3k.log ./birdseye-30k.log
diff ./jerboa-3k.log ./birdseye-300k.log
```

The diff output is expected to show that BirdsEyeAnalysis does more netting, because it nets after every transfer, and Jerboa only nets the balances after all transfers are finished.
Other than that, Jerboa takes about 15 seconds on 30k transactions which is really quite slow. We're working on improving that to get it closer to the BirdsEye performance.