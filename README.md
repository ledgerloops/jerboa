# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Development
Although you can also run Jerboa with Redis or in-memory, the best way is with TigerBeetle:

* First window: [Start your TigerBeetle cluster](https://docs.tigerbeetle.com/quick-start#3-start-your-cluster)
```
./tigerbeetle start --addresses=3000 --development 0_0.tigerbeetle
```
* Second window: Run the main server
```
npm install
STORE=tigerbeetle node build/src/main.js
```
* Third window: Run the feeder
```
time node build/src/feeder.js
```