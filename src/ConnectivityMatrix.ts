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
  addPath(from: string, to: string, hops: string[]): void {
    // if (from === to) {
    //   return;
    // }
    for (let i = 0; i < hops.length; i++) {
      if (hops[i] === from) {
        return;
      }
      if (hops[i] === to) {
        return;
      }
    }
    this.ensureCell(from, to);
    this.matrix[from][to][JSON.stringify(hops)] = true;
  }
  addLink(linkFrom: string, linkTo: string): void {
    // add the link itself as a path
    // console.log('direct link', linkFrom, linkTo);
    this.addPath(linkFrom, linkTo, []);
    // for each existing path, append it
    Object.keys(this.matrix).forEach(existingFrom => {
      Object.keys(this.matrix[existingFrom]).forEach(existingTo => {
        if (existingTo === linkFrom) {
          Object.keys(this.matrix[existingFrom][existingTo]).forEach((hopsStr: string) => {
            const existingHops = JSON.parse(hopsStr);
            const newHops = existingHops.concat(existingTo);
            this.addPath(existingFrom, linkTo, newHops);
          });
          // console.log('appending', existingFrom, existingTo, linkFrom, linkTo);
        } else {
          // console.log('not appending', existingFrom, existingTo, linkFrom, linkTo);
        }
        if (existingFrom === linkTo) {
          Object.keys(this.matrix[existingFrom][existingTo]).forEach((hopsStr: string) => {
            const existingHops = JSON.parse(hopsStr);
            const newHops = [existingFrom].concat(existingHops);
            this.addPath(linkFrom, existingTo, newHops);
          });
          // console.log('prepending', linkFrom, linkTo, existingFrom, existingTo);
        } else {
          // console.log('not prepending', linkFrom, linkTo, existingFrom, existingTo);
        }
      });
    });
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
            console.log('joining', hopsStr, to, hops);
            let smallest = Infinity;
            let smallestPos;
            for (let i = 0; i<hops.length; i++) {
              if (hops[i] < smallest) {
                smallest = hops[i];
                smallestPos = i;
              }
            }
            // console.log('')
            lines.push(JSON.stringify(hops.slice(smallestPos).concat(hops.slice(0, smallestPos))));
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