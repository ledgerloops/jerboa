import { writeFileSync } from 'fs';
export class ConnectivityMatrix {
  matrix: {
    [from: string]: {
      [to: string]: {
        [hops: string]: boolean
      }
    }
  } = {};
  ensureCell(from: string, to: string): void {
    if (typeof this.matrix[from] === 'undefined') {
      this.matrix[from] = {};
    }
    if (typeof this.matrix[from][to] === 'undefined') {
      this.matrix[from][to] = {};
    }
  }
  addPath(from: string, to: string, hops: string[]): boolean {
    // if (from === to) {
    //   return;
    // }
    for (let i = 0; i < hops.length; i++) {
      if (hops[i] === from) {
        return true;
      }
      if (hops[i] === to) {
        return true;
      }
    }
    this.ensureCell(from, to);
    const exists = this.matrix[from][to][JSON.stringify(hops)];
    this.matrix[from][to][JSON.stringify(hops)] = true;
    return !!exists;
  }
  addLink(linkFrom: string, linkTo: string): void {
    
    // add the link itself as a path
    // console.log('direct link', linkFrom, linkTo);
    this.addPath(linkFrom, linkTo, []);
    // const exists = this.addPath(linkFrom, linkTo, []);
    // if (exists) {
    //   return;
    // }
    // // for each existing path, append it
    // Object.keys(this.matrix).forEach(existingFrom => {
    //   Object.keys(this.matrix[existingFrom]).forEach(existingTo => {
    //     if (existingTo === linkFrom) {
    //       Object.keys(this.matrix[existingFrom][existingTo]).forEach((hopsStr: string) => {
    //         const existingHops = JSON.parse(hopsStr);
    //         const newHops = existingHops.concat(existingTo);
    //         this.addPath(existingFrom, linkTo, newHops);
    //       });
    //       // console.log('appending', existingFrom, existingTo, linkFrom, linkTo);
    //     } else {
    //       // console.log('not appending', existingFrom, existingTo, linkFrom, linkTo);
    //     }
    //     if (existingFrom === linkTo) {
    //       Object.keys(this.matrix[existingFrom][existingTo]).forEach((hopsStr: string) => {
    //         const existingHops = JSON.parse(hopsStr);
    //         const newHops = [existingFrom].concat(existingHops);
    //         this.addPath(linkFrom, existingTo, newHops);
    //       });
    //       // console.log('prepending', linkFrom, linkTo, existingFrom, existingTo);
    //     } else {
    //       // console.log('not prepending', linkFrom, linkTo, existingFrom, existingTo);
    //     }
    //   });
    // });
  }
  savePaths(filename: string, loopsOnly: boolean): void {
    const lines = [];
    Object.keys(this.matrix).forEach(from => {
      Object.keys(this.matrix[from]).forEach(to => {
        if (loopsOnly && (from !== to)) {
          // skip
        } else {
          Object.keys(this.matrix[from][to]).forEach((hopsStr: string) => {
            const hops = JSON.parse(hopsStr).concat(to).map(x => parseInt(x));
            // console.log('joining', hopsStr, to, hops);
            let smallest = Infinity;
            let smallestPos;
            for (let i = 0; i<hops.length; i++) {
              if (hops[i] < smallest) {
                smallest = hops[i];
                smallestPos = i;
              }
            }
            // console.log('')
            if (loopsOnly && hops.length < 2) {
              throw new Error(`How can hops have length < 2? ${hops}`);
            } else if (loopsOnly && hops.length === 2) {
              // skip
            } else {
              const hopsFromSmallest = hops.slice(smallestPos).concat(hops.slice(0, smallestPos));
              let reverseDeduplicated = hopsFromSmallest;
              if (hopsFromSmallest[1] > hopsFromSmallest[hopsFromSmallest.length -1]) {
                reverseDeduplicated = [hopsFromSmallest[0]].concat(hopsFromSmallest.slice(1).reverse());
                // console.log(hopsFromSmallest, hopsFromSmallest[0], hopsFromSmallest.slice(1).reverse(), reverseDeduplicated);
              }
              const newLine = JSON.stringify(reverseDeduplicated);
              if (lines.indexOf(newLine) === -1) {
                lines.push(newLine);
              }
            }
          });
        }
      });
    });
    writeFileSync(filename, lines.join('\n'));
  }
  print(): void {
    Object.keys(this.matrix).forEach(from => {
      Object.keys(this.matrix[from]).forEach(to => {
        Object.keys(this.matrix[from][to]).forEach((hopsStr: string) => {
          const hops = JSON.parse(hopsStr);
          console.log(`${from}-[${hops.join('-')}]-${to}`);
        });
      });
    });
  }
}