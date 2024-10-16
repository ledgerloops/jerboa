# LedgerLoops using the Sarafu dataset

In order to know whether our algorithm actually works and scales, we tested it on a rather large dataset: the Sarafu dataset.

## The Sarafu Dataset
The Sarafu Dataset is [openly available](https://www.nature.com/articles/s41597-022-01539-4) and describes 440,000 transactions between
roughly 55,000 accounts. We use it here to see if the LedgerLoops algorithm can efficiently find loops.

## Definition of Loops
Consider the following small dataset:
```
Transaction 1: Node 1 sends node 2 a transfer of 50 units
Transaction 2: Node 2 sends node 3 a transfer of 150 units
Transaction 3: Node 3 sends node 2 a transfer of 25 units
Transaction 4: Node 3 sends node 1 a transfer of 25 units
```
If these transactions are administered on a single ledger, then the balances would evolve as follows:

After transaction | Node 1 balance | Node 2 balance  | Node 3 balance
------------------|----------------|-----------------|-----------------
0                 |      0         |      0          |      0
1                 | 0 - 50 = -50   | 0 + 50 = 50     |      0
2                 |    -50         | 50 - 150 = -100 | 0 + 150 = 150
3                 |    -50         | -100 + 25 = -75 | 150 - 25 = 125
4                 | -50 + 25 = -25 |    -75          | 125 - 25 = 100

Note that in this situation, each node has only a single balance against its environment, and netting
happens explicitly as a part of each transaction. At each transaction, two of the balances on the central
ledger are updated.

It is, however, also possible to implement a payment network using just bilateral peer-to-peer trustlines.
In that case, the balances would evolve as follows:

After transaction | [1->2, 1->3] bilateral balances | [2->1, 2->3] bilateral balances  |[3->1, 3->2] bilateral balances
------------------|---------------------------------|----------------------------------|-----------------
0                 |      [ 0, 0  ]                  |     [ 0, 0 ]                     |      [ 0, 0 ]
1                 |      [-50, 0 ]                  |     [ 50 , 0 ]                   |      [ 0, 0 ]
2                 |      [-50, 0 ]                  |     [ 50, -150 ]                 |      [ 0, 150 ]
3                 |      [-50, 0 ]                  |     [ 50 , -125 ]                |      [ 0, 125 ]
4                 |      [-50, 25 ]                 |     [ 50 , -125 ]                |      [ -25, 125 ]

Note that in this case bilateral netting between nodes 2 and 3 is still immediate, and transactions 2 and 3 partially
cancel each other out.

However, whereas the central ledger ends up with a total deployed balance of 100 units,
the system of bilateral ledgers ends up with total deployed balance of 50 + (150-25) + 25 = 200 units.

In order to reduce the total deployed balance in a network of bilateral ledgers, loops can be used.
They consist of a set of transactions, one per ledger, that reduce the total deployed balance in a way all participants can agree with.

So in this case:
```
Transaction 5a: Node 2 sends node 1 a loop-transfer 25 units.
Transaction 5b: Node 3 sends node 2 a loop-transfer 25 units.
Transaction 5c: Node 1 sends node 3 a loop-transfer 25 units.
```
And the effect:

After transaction | [1->2, 1->3] bilateral balances | [2->1, 2->3] bilateral balances  |[3->1, 3->2] bilateral balances
------------------|---------------------------------|----------------------------------|-----------------
5a                |      [ -50 + 25 = -25, 25 ]     |     [ 50 - 25 = 25, -125 ]       |      [ -25, 125 ]
5b                |      [ -25, 25 ]                |     [ 25, -125 + 25 = -100 ]     |      [ -25, 125 - 25 = 100 ]
5c                |      [ -25, 25 - 25 = 0 ]       |     [ 25, -100 ]                 |      [ -25 + 25 = 0, 100 ]

The total deployed balance has now been reduced by 3 times 25 units, from 50 + (150-25) + 25 = 200 units to (50-25) + (150-25-25) + (25-25) = 125 units.

## Performance
### Bandwidth
In the simulation, our algorithm triggered an average of 13 messages per transaction. This includes the transfer message itself, plus all probe and nack messages used for loop detection, plus all scout, propose and commit used for loop removal. The messages were roughly 64 bytes each, so the total amount of bandwidth used for one transfer was roughly 1 Kb.

We think this is a very reasonable requirement on modern internet-connected systems.

### Processor Time using a benchmark bird's eye view algorithm in a single thread took 21 seconds.

The simulation, reading all 440,000 `STANDARD` transactions from the `sarafu_txns_20200125-20210615.csv` file,
keeping track of the balances of each of the 40,000 participants, and detecting 7,000 loops in a single thread, took 90 seconds.

In these 90 seconds, 5 million messages were processed, so this is equivalent to 60,000 messages processed per second, in a single-thread, on a laptop from 2019.

We think this is also a very reasonable Processor Time requirement.

## Conclusion
### Observations
The current algorithm is a first versions, and we expect that over time it will get even better. However, the current performance is very impressive both in terms of low cost and in terms of high benefits.

### Tech Preview
Our implementation of the LedgerLoops algorithm is now available for use in technology pilot projects. Please contact michiel@unhosted.org to book a free demonstration.

### Algorithm Open Standard
We invite other implementers to implement software compatible with ours, by following the IETF internet draft which will be published soon.
 