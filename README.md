# Work in Progress
# Not Public Yet

![jerboa](./jerboa.jpg)

## Development
```
$ npm install
$ npm test
$ npm run build
$ time node build/src/analysis.js
Done after 500332 steps
{
  '2': { numFound: 739613, totalAmount: 159647493.82300043 },
  '3': { numFound: 3459, totalAmount: 4429854.625000001 },
  '4': { numFound: 2635, totalAmount: 1733074.771 },
  '5': { numFound: 2040, totalAmount: 1080468.2000000032 },
  '6': { numFound: 1754, totalAmount: 767042.2849999989 },
  '7': { numFound: 1588, totalAmount: 545537.297999998 },
  '8': { numFound: 1608, totalAmount: 550941.9159999999 },
  '9': { numFound: 1574, totalAmount: 347974.462000003 },
  '10': { numFound: 1126, totalAmount: 181979.9489999989 },
  '11': { numFound: 1015, totalAmount: 163858.33799999836 },
  '12': { numFound: 887, totalAmount: 127871.59100000026 },
  '13': { numFound: 778, totalAmount: 104404.78000000067 },
  '14': { numFound: 831, totalAmount: 106961.96000000235 },
  '15': { numFound: 777, totalAmount: 113135.84000000055 },
  '16': { numFound: 764, totalAmount: 105096.2999999973 },
  '17': { numFound: 651, totalAmount: 72980.63000000088 },
  '18': { numFound: 509, totalAmount: 46808.99000000084 },
  '19': { numFound: 491, totalAmount: 45691.920000001606 },
  '20': { numFound: 467, totalAmount: 39135.70000000093 },
  '21': { numFound: 470, totalAmount: 40616.79999999847 },
  '22': { numFound: 441, totalAmount: 40936.939999999544 },
  '23': { numFound: 333, totalAmount: 29780.4400000005 },
  '24': { numFound: 302, totalAmount: 24782.429999997825 },
  '25': { numFound: 337, totalAmount: 26443.970000001045 },
  '26': { numFound: 255, totalAmount: 18283.58999999957 },
  '27': { numFound: 262, totalAmount: 19606.46000000055 },
  '28': { numFound: 201, totalAmount: 14125.350000001334 },
  '29': { numFound: 172, totalAmount: 13194.549999999552 },
  '30': { numFound: 157, totalAmount: 9762.580000000355 },
  '31': { numFound: 187, totalAmount: 11160.070000001091 },
  '32': { numFound: 123, totalAmount: 6948.569999999371 },
  '33': { numFound: 122, totalAmount: 7987.739999999091 },
  '34': { numFound: 128, totalAmount: 7364.910000000404 },
  '35': { numFound: 110, totalAmount: 6017.299999999585 },
  '36': { numFound: 73, totalAmount: 4195.280000000063 },
  '37': { numFound: 78, totalAmount: 5077.540000000202 },
  '38': { numFound: 65, totalAmount: 3742.739999999576 },
  '39': { numFound: 59, totalAmount: 3442.969999999485 },
  '40': { numFound: 45, totalAmount: 2407.800000000074 },
  '41': { numFound: 42, totalAmount: 2549.9800000002397 },
  '42': { numFound: 27, totalAmount: 1578.8200000002776 },
  '43': { numFound: 25, totalAmount: 1274.8300000000409 },
  '44': { numFound: 26, totalAmount: 967.0400000003214 },
  '45': { numFound: 32, totalAmount: 1324.7999999995175 },
  '46': { numFound: 18, totalAmount: 607.319999999685 },
  '47': { numFound: 18, totalAmount: 804.799999999883 },
  '48': { numFound: 10, totalAmount: 504.99999999990587 },
  '49': { numFound: 15, totalAmount: 513.0699999999118 },
  '50': { numFound: 6, totalAmount: 219.19999999987226 },
  '51': { numFound: 12, totalAmount: 701.8900000002167 },
  '52': { numFound: 7, totalAmount: 200.99999999977808 },
  '53': { numFound: 6, totalAmount: 154.68000000005122 },
  '54': { numFound: 12, totalAmount: 363.03999999979794 },
  '55': { numFound: 8, totalAmount: 323.63999999995076 },
  '56': { numFound: 5, totalAmount: 242.68000000003758 },
  '57': { numFound: 4, totalAmount: 146.2199999999374 },
  '58': { numFound: 3, totalAmount: 58.70999999997446 },
  '60': { numFound: 3, totalAmount: 130.00000000016098 },
  '62': { numFound: 2, totalAmount: 169.36000000021295 },
  '63': { numFound: 1, totalAmount: 11.680000000089422 },
  '64': { numFound: 1, totalAmount: 1.8599999999653392 },
  '65': { numFound: 1, totalAmount: 26 },
  '66': { numFound: 2, totalAmount: 24.999999999862666 },
  '67': { numFound: 1, totalAmount: 156.930000000002 },
  '68': { numFound: 1, totalAmount: 113.69999999998163 }
}
Graph has 0 nodes and 0 links left
After 422721 transactions with a total amount of 296.9910196480003 million
189.10439082399995 million (64%) was immediately netted bilaterally
And a further 65.095298411 million (22%) was netted in 27162 loops
Leaving 42.79133041300035 million (14%) to be settled out of band

real	0m37.647s
user	0m34.820s
sys	0m6.603s```
