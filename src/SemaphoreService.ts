export class SemaphoreService {
  private queue: (() => Promise<void>)[] = [];
  private running: boolean = false;
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
    if (this.running) {
      return;
    }
    if (this.queue.length === 0) {
      return;
    }
    const currentCallback = this.queue.shift();
    this.debug(`semaphore queue length decreased to ${this.queue.length}`);
    this.running = true;
    currentCallback().then(() => {
      this.running = false;
      this.maybeRun();
    });
  }
  getQueueLength(): number {
    return this.queue.length;
  }
}