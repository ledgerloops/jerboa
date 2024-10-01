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
$ time node build/src/birdsEyeAnalysis.js 
Done after 500332 steps
{
  '2': { numFound: 739613, totalAmount: 159647493.82300043 },
  '3': { numFound: 3459, totalAmount: 4429854.625000001 },
  '4': { numFound: 2635, totalAmount: 1733074.771 },
  '5': { numFound: 2040, totalAmount: 1080468.2000000032 },
  '6': { numFound: 1754, totalAmount: 767042.2849999989 },
  '7': { numFound: 1588, totalAmount: 545537.297999998 },
[...]
  '66': { numFound: 2, totalAmount: 24.999999999862666 },
  '67': { numFound: 1, totalAmount: 156.930000000002 },
  '68': { numFound: 1, totalAmount: 113.69999999998163 }
}
Graph has 0 nodes and 0 links left
After 422721 transactions with a total amount of 297 million
189 million (64%) was immediately netted bilaterally
And a further 65 million (22%) was netted in 27162 loops
Leaving 43 million (14%) to be settled out of band
```
And the Jerboa version is a lot slower, even on a smaller data set:
```
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
