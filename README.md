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

time node build/src/analysis.js __tests__/fixture-300.csv > p2p-30.log 
time node build/src/analysis.js __tests__/fixture-300.csv > p2p-300.log 
time node build/src/analysis.js __tests__/fixture-3000.csv > p2p-3k.log 

diff ./p2p-30.log ./birdseye-30.log
diff ./p2p-300.log ./birdseye-300.log
diff ./p2p-3k.log ./birdseye-3k.log
```
