export class SemaphoreService {
  private queue: (() => Promise<void>)[] = [];
  private running: boolean = false;
  private shuttingDown: boolean = false;
  private timer;
  debug(str: string): void {
    if (process.env.VERBOSE) {
      console.log(str);
    }
  }
  joinQueue(callback: () => Promise<void>): void {
    this.queue.push(callback);
    this.debug(`semaphore queue length increased to ${this.queue.length}`);
    this.maybeRun();
  }
  maybeRun(): void {
    if (this.shuttingDown) {
      return;
    }
    if (this.running) {
      return;
    }
    if (this.queue.length === 0) {
      return;
    }
    const currentCallback = this.queue.shift();
    this.debug(`semaphore queue length decreased to ${this.queue.length}`);
    this.running = true;
    this.timer = setTimeout(() => {
      if (this.shuttingDown) {
        return;
      }
      throw new Error(`Job is taking too long!`);
    }, 100000);
    currentCallback().then(() => {
      clearTimeout(this.timer);
      this.running = false;
      this.maybeRun();
    });
  }
  getQueueLength(): number {
    return this.queue.length;
  }
  shutdown(): void {
    clearTimeout(this.timer);
    this.shuttingDown = true;
  }
}