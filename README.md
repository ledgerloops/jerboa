# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Development
Although you can also run Jerboa with Redis or in-memory, the best way is with TigerBeetle:
* Preparation: [install TigerBeetle](https://docs.tigerbeetle.com/quick-start) including this step:
```
./tigerbeetle format --cluster=0 --replica=0 --replica-count=1 0_0.tigerbeetle
```

* First window: [Start your TigerBeetle cluster](https://docs.tigerbeetle.com/quick-start#3-start-your-cluster)
```
./tigerbeetle start --addresses=3000 0_0.tigerbeetle
```

### CSV to TB
* Second window: Seed TigerBeetle from the CSV file with Sarafu data:
```
npm install
npm run build
time node build/src/csv-to-tigerbeetle.js
```
This should import the whole Sarafu dataset from CSV to TB in 78 seconds
