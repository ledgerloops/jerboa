const ObjectKeys = Object.keys as <T extends object>(obj: T) => Array<keyof T>

export class ConnectivityMatrix {
  matrix: {
    [from: number]: {
      [to: number]: {
        [hops: string]: boolean
      }
    }
  } = {};
  ensureCell(from: number, to: number): void {
    if (typeof this.matrix[from] === 'undefined') {
      this.matrix[from] = {};
    }
    if (typeof this.matrix[from][to] === 'undefined') {
      this.matrix[from][to] = {};
    }
  }
  addPath(from: number, to: number, hopsStr: string): void {
    this.ensureCell(from, to);
    this.matrix[from][to][hopsStr] = true;
  }
  addLink(linkFrom: number, linkTo: number): void {
    // add the link itself as a path
    this.addPath(linkFrom, linkTo, '');
    // for each existing path, append it
    ObjectKeys(this.matrix).forEach(existingFrom => {
      ObjectKeys(this.matrix[existingFrom]).forEach(existingTo => {
        ObjectKeys(this.matrix[existingFrom][existingTo]).forEach(hopsStr => {
          const newHopsStr = `${hopsStr} ${existingTo}`;
          this.addPath(existingFrom, linkTo, newHopsStr);
        });
      });
    });
  }
  print(): void {
    ObjectKeys(this.matrix).forEach(from => {
      ObjectKeys(this.matrix[from]).forEach(to => {
        ObjectKeys(this.matrix[from][to]).forEach(hopsStr => {
          console.log(`${from}-[${hopsStr}]-${to}`);
        });
      });
    });
  }
}