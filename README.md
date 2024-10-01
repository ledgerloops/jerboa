# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Development
The script became a lot slower in https://github.com/ledgerloops/jerboa/pull/12
Before, it was able to process all 400k transactions in 40-80 seconds,
now it can only process 30k transactions in 150 seconds:

```
$ npm install
$ npm test
$ npm run build
$ time node build/src/analysis.js ./__tests__/fixture-30000.csv 
[...]
{
  '2': { numFound: 3087, totalAmount: 2040909.805 },
  '3': { numFound: 378, totalAmount: 119575.7 },
  '4': { numFound: 207, totalAmount: 69575.4 },
  '5': { numFound: 169, totalAmount: 31501.8 },
  '6': { numFound: 142, totalAmount: 19833.5 },
  '7': { numFound: 75, totalAmount: 8307.3 },
  '8': { numFound: 75, totalAmount: 6521 },
  '9': { numFound: 40, totalAmount: 2672 },
  '10': { numFound: 37, totalAmount: 2044 },
  '11': { numFound: 22, totalAmount: 1692 },
  '12': { numFound: 31, totalAmount: 2639 },
  '13': { numFound: 14, totalAmount: 966 },
  '14': { numFound: 12, totalAmount: 860 },
  '15': { numFound: 7, totalAmount: 443 },
  '16': { numFound: 15, totalAmount: 951 },
  '17': { numFound: 14, totalAmount: 475 },
  '18': { numFound: 6, totalAmount: 354 },
  '19': { numFound: 3, totalAmount: 101 },
  '20': { numFound: 1, totalAmount: 10 },
  '21': { numFound: 4, totalAmount: 246 },
  '22': { numFound: 1, totalAmount: 5 },
  '26': { numFound: 2, totalAmount: 56 },
  '28': { numFound: 1, totalAmount: 5 },
  '29': { numFound: 1, totalAmount: 4 }
}
Graph has 7019 nodes and 24306 links left
After 30000 transactions with a total amount of 11 million
4 million (36%) was immediately netted bilaterally
And a further 1 million (11%) was netted in 1257 loops
Leaving 6 million (53%) to be settled out of band

real	2m27.350s
user	2m26.248s
sys	0m1.078s
```
