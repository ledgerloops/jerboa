export class SemaphoreService {
  private queue: (() => Promise<void>)[] = [];
  private running: boolean = false;
  joinQueue(callback: () => Promise<void>): void {
    this.queue.push(callback);
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
    this.running = true;
    currentCallback().then(() => {
      this.running = false;
      this.maybeRun();
    });
  }
}