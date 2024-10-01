# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Development
The script became a lot slower in https://github.com/ledgerloops/jerboa/pull/12
Before, it was able to process all 400k transactions in 40-80 seconds,
now it can only process 30k transactions in 150 seconds:

```
npm install
npm test
npm run build
time node build/src/birdsEyeAnalysis.js __tests__/fixture-300.csv > birdseye-30.log
time node build/src/birdsEyeAnalysis.js __tests__/fixture-300.csv > birdseye-300.log
time node build/src/birdsEyeAnalysis.js __tests__/fixture-3000.csv > birdseye-3k.log

time node build/src/analysis.js __tests__/fixture-300.csv > jerboa-30.log
time node build/src/analysis.js __tests__/fixture-300.csv > jerboa-300.log
time node build/src/analysis.js __tests__/fixture-3000.csv > jerboa-3k.log

diff ./jerboa-30.log ./birdseye-30.log
diff ./jerboa-300.log ./birdseye-300.log
diff ./jerboa-3k.log ./birdseye-3k.log
```

The diff output is expected to show that BirdsEyeAnalysis does more netting, because it nets after every transfer, and Jerboa only nets the balances after all transfers are finished.
Other than that, Jerboa takes about 5 seconds on 3k transactions which is really quite slow. We're working on improving that to get it closer to the BirdsEye performance.