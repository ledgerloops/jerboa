# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Development
Although you can also run Jerboa with Redis or in-memory, the best way is with TigerBeetle:
* Preparation: [install TigerBeetle](https://docs.tigerbeetle.com/quick-start) including this step:
```
tigerbeetle format --cluster=0 --replica=0 --replica-count=1 data/empty
cp data/empty data/sarafu
```

* First window: [Start your TigerBeetle cluster](https://docs.tigerbeetle.com/quick-start#3-start-your-cluster)
```
tigerbeetle start --addresses=3000 data/sarafu
```

### CSV to TB
* Second window: Seed TigerBeetle from the CSV file with Sarafu data:
```
npm install
npm run build
time node build/src/csv-to-tigerbeetle.js
cp data/sarafu data/sarafu.bak
```
This should import the whole Sarafu dataset from CSV to TB in 78 seconds

### Development
Make a copy of the `data/sarafu` file so you can reset it when needed.
```
time node --max-old-space-size=100000 build/src/connectivityAnalysis.js
```

idea for algorithm:
take the directed graph
remove all edges that come from or go to a leaf
repeat that until no more found
the rest is cyclic structure!