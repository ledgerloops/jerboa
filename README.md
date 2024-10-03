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
npm start

time node build/src/birdsEyeAnalysis.js __tests__/fixture-30.csv > birdseye-30.out
time node build/src/birdsEyeAnalysis.js __tests__/fixture-300.csv > birdseye-300.out
time node build/src/birdsEyeAnalysis.js __tests__/fixture-3k.csv > birdseye-3k.out
time node build/src/birdsEyeAnalysis.js __tests__/fixture-30k.csv > birdseye-30k.out
time node build/src/birdsEyeAnalysis.js __tests__/fixture-300k.csv > birdseye-300k.out

PROBING_REPORT=1 time node build/src/main.js __tests__/fixture-30.csv > jerboa-30.out
PROBING_REPORT=1 time node build/src/main.js __tests__/fixture-300.csv > jerboa-300.out
PROBING_REPORT=1 time node build/src/main.js __tests__/fixture-3k.csv > jerboa-3k.out
PROBING_REPORT=1 time node build/src/main.js __tests__/fixture-30k.csv > jerboa-30k.out
PROBING_REPORT=1 time node build/src/main.js __tests__/fixture-300k.csv > jerboa-300k.out
```
