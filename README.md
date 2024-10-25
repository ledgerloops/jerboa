# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Sarafu-Based Netting Challenge
To participate in the [Sarafu-Based Netting Challenge](https://github.com/ledgerloops/strategy-pit/pull/41), check out the strategy-pit repo next to this one,
and run:
```
npm run build
time node build/src/jerboaChallenge.js __tests__/fixtures/sarafu-10k.csv
NUM_WORKERS=20 time node build/src/jerboaChallenge.js __tests__/fixtures/sarafu-50k.csv __tests__/fixtures/sarafu-50k.solution
NUM_WORKERS=20 time node build/src/jerboaChallenge.js __tests__/fixtures/sarafu-100k.csv
NUM_WORKERS=20 time node build/src/jerboaChallenge.js ../Sarafu2021_UKdb_submission/sarafu_xDAI/sarafu_txns_20200125-20210615.csv
```

You can pipe the output to a file (or add some code to write it to a file from `./src/jerboaChallenge.ts`)
and then follow the [instructions](https://github.com/ledgerloops/strategy-pit/tree/sarafu-netting-challenge?tab=readme-ov-file#solution-analysis) to analyse the result.