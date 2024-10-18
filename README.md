# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Sarafu-Based Netting Challenge
To participate in the [Sarafu-Based Netting Challenge](https://github.com/ledgerloops/strategy-pit/pull/41), check out the strategy-pit repo next to this one,
and run:
```
npm run build
time node build/src/jerboaChallenge.js ../strategy-pit/debt.csv ./jerboa.csv
time node build/src/jerboaChallenge.js ../strategy-pit/mcf-out.csv ./mcf-jerboa.csv
node ../strategy-pit/build/src/analyse-sarafu-challenge-solution.js ../strategy-pit/debt.csv ./jerboa.csv
node ../strategy-pit/build/src/analyse-sarafu-challenge-solution.js ../strategy-pit/debt.csv ./mcf-jerboa.csv
```
And then follow the [instructions](https://github.com/ledgerloops/strategy-pit/tree/sarafu-netting-challenge?tab=readme-ov-file#solution-analysis) to analyse the result.