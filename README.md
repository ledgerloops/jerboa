# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Development
```
$ npm install
$ npm test
$ npm run build
$ time node build/src/analysis.js
{
  '2': { numFound: 453819, totalAmount: 159658153.05299765 },
  '3': { numFound: 3414, totalAmount: 4386332.635000002 },
  '4': { numFound: 2646, totalAmount: 1725741.881 },
  '5': { numFound: 2025, totalAmount: 1087195.8399999996 },
  '6': { numFound: 1804, totalAmount: 798173.0050000008 },
  '7': { numFound: 1595, totalAmount: 538299.6079999992 },
  '8': { numFound: 1599, totalAmount: 544672.0260000001 },
  '9': { numFound: 1617, totalAmount: 352474.1920000011 },
  '10': { numFound: 1085, totalAmount: 181901.52899999946 },
  '11': { numFound: 1012, totalAmount: 160458.01799999873 },
  '12': { numFound: 882, totalAmount: 126824.20100000034 },
  '13': { numFound: 779, totalAmount: 103249.32999999935 },
  '14': { numFound: 772, totalAmount: 103808.76000000013 },
  '15': { numFound: 786, totalAmount: 112350.17000000176 },
  '16': { numFound: 771, totalAmount: 105961.7599999994 },
  '17': { numFound: 634, totalAmount: 72826.27999999966 },
  '18': { numFound: 530, totalAmount: 50431.95999999986 },
  '19': { numFound: 542, totalAmount: 50192.07999999784 },
  '20': { numFound: 473, totalAmount: 37958.71000000005 },
  '21': { numFound: 429, totalAmount: 39414.62000000041 },
  '22': { numFound: 467, totalAmount: 43078.630000000914 },
  '23': { numFound: 344, totalAmount: 31512.39999999859 },
  '24': { numFound: 371, totalAmount: 29928.299999999566 },
  '25': { numFound: 315, totalAmount: 24142.020000000644 },
  '26': { numFound: 254, totalAmount: 18574.66000000074 },
  '27': { numFound: 256, totalAmount: 18248.309999999663 },
  '28': { numFound: 196, totalAmount: 12759.059999999474 },
  '29': { numFound: 161, totalAmount: 11144.340000000477 },
  '30': { numFound: 163, totalAmount: 10647.159999999893 },
  '31': { numFound: 169, totalAmount: 10339.909999999558 },
  '32': { numFound: 126, totalAmount: 7922.790000000318 },
  '33': { numFound: 135, totalAmount: 8731.789999999648 },
  '34': { numFound: 114, totalAmount: 7109.740000000271 },
  '35': { numFound: 121, totalAmount: 7113.780000000224 },
  '36': { numFound: 102, totalAmount: 5980.6299999996045 },
  '37': { numFound: 60, totalAmount: 4047.0800000002955 },
  '38': { numFound: 76, totalAmount: 3338.7499999996003 },
  '39': { numFound: 47, totalAmount: 2845.8600000004444 },
  '40': { numFound: 46, totalAmount: 2217.2400000002654 },
  '41': { numFound: 28, totalAmount: 1623.799999999701 },
  '42': { numFound: 36, totalAmount: 1846.9399999997513 },
  '43': { numFound: 22, totalAmount: 845.7100000001176 },
  '44': { numFound: 27, totalAmount: 1232.7100000001356 },
  '45': { numFound: 21, totalAmount: 1215.5999999999472 },
  '46': { numFound: 16, totalAmount: 409.8000000005203 },
  '47': { numFound: 14, totalAmount: 384.8000000000634 },
  '48': { numFound: 16, totalAmount: 823.559999999867 },
  '49': { numFound: 17, totalAmount: 575.4900000000431 },
  '50': { numFound: 4, totalAmount: 182.17999999998597 },
  '51': { numFound: 11, totalAmount: 690.4199999999859 },
  '52': { numFound: 10, totalAmount: 303.4100000002662 },
  '53': { numFound: 7, totalAmount: 373.64000000005933 },
  '54': { numFound: 3, totalAmount: 83.9999999999543 },
  '55': { numFound: 1, totalAmount: 29.999999999997158 },
  '56': { numFound: 2, totalAmount: 110.99999999988586 },
  '57': { numFound: 2, totalAmount: 76.00000000001933 },
  '59': { numFound: 1, totalAmount: 175.9999999999975 },
  '60': { numFound: 1, totalAmount: 46.20000000000243 },
  '62': { numFound: 1, totalAmount: 5.400000000030218 },
  '63': { numFound: 4, totalAmount: 98.18000000004088 },
  '64': { numFound: 5, totalAmount: 177.59999999998263 },
  '65': { numFound: 1, totalAmount: 113.99999999999864 },
  '66': { numFound: 2, totalAmount: 91.0000000001179 },
  '70': { numFound: 1, totalAmount: 45.000000000004775 }
}
Graph has 0 nodes and 0 links left
After 422721 transactions with a total amount of 297 million
189 million (64%) was immediately netted bilaterally
And a further 65 million (22%) was netted in 27171 loops
Leaving 43 million (14%) to be settled out of band

real	1m21.488s
user	1m16.387s
sys	0m11.969s
```
