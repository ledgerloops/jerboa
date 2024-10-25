import { Worker, WorkerOptions } from './Worker.js';
import { Message } from './MessageTypes.js';
import { SemaphoreService } from './SemaphoreService.js';

export class SingleThread {
  private workers: Worker[] = [];
  private sarafuFile: string | undefined;
  private debtFile: string | undefined;
  private solutionCallback: (string) => void | undefined;
  private semaphoreService: SemaphoreService;
  private maxSecondsBetweenLoops?: number;
  private lastFindTime: number = new Date().getTime();
  constructor(options: { numWorkers: number, sarafuFile?: string, debtFile?: string, solutionCallback?: (string) => void, maxSecondsBetweenLoops?: number }) {
    this.debtFile = options.debtFile;
    this.solutionCallback = options.solutionCallback;
    this.sarafuFile = options.sarafuFile;
    this.semaphoreService = new SemaphoreService();
    this.maxSecondsBetweenLoops = options.maxSecondsBetweenLoops;
    for (let i = 0; i < options.numWorkers; i++) {
      // console.log(`Instantiating worker ${i} of ${numWorkers}`);
      const workerOptions: WorkerOptions = {
        workerNo: i,
        numWorkers: options.numWorkers,
        solutionCallback: (line: string) => {
          this.lastFindTime = new Date().getTime();
          if (this.solutionCallback) {
            const lines = [ line ];
            // if (process.env.VERBOSE) {
            //   for (let i = 0; i < options.numWorkers; i++) {
            //     this.workers[i].reportState((reportLine: string) => {
            //       lines.push(reportLine);
            //     });
            //   }
            //   lines.push('');
            // }
            // lines.push('');
            this.solutionCallback(lines.join('\n'));
          }
        },
        sendMessage: (from: string, to: string, message: Message): void => {
          if (isNaN(parseInt(to)))  {
            throw new Error(`to '${to}' is not parseable as an int - ${from} ${to} ${JSON.stringify(message)}`);
          }
          const receivingWorker = this.workers[parseInt(to) % this.workers.length];
          receivingWorker.queueMessageForLocalDelivery(from, to, message);
          // receivingWorker.deliverMessageToNodeInThisWorker(from, to, message);
        },
        semaphoreService: this.semaphoreService,
      };
      this.workers[i] = new Worker(workerOptions);
    }
  }
  debug(str: string): void {
    if (process.env.VERBOSE) {
      console.log(str);
    }
  }
  async deliverAllMessages(): Promise<void> {
    let hadMessagesToDeliver;
    do {
      hadMessagesToDeliver = false;
      for (let i = 0; i < this.workers.length; i++ ) {
        if (await this.workers[i].deliverOneMessage()) {
          hadMessagesToDeliver = true;
        }
      }
      // this helps flushing the output to stdout and into the solution file:
      await new Promise(resolve => setTimeout(resolve, 0));
    } while(hadMessagesToDeliver && !this.gettingBored());
  }
  private gettingBored(): boolean {
    if (this.maxSecondsBetweenLoops === undefined) {
      return false;
    }
    const msSinceLastFind = new Date().getTime() - this.lastFindTime;
    this.debug(`${msSinceLastFind}ms since last find, compared to ${1000 * this.maxSecondsBetweenLoops}`);
    return  msSinceLastFind > 1000 * this.maxSecondsBetweenLoops;
  }
  async runAllWorkers(): Promise<number> {
    if (this.sarafuFile) {
      await Promise.all(this.workers.map(async (worker) => worker.readTransfersFromCsv(this.sarafuFile)));
    }
    if (this.debtFile) {
      await Promise.all(this.workers.map(async (worker) => worker.readDebtFromCsv(this.debtFile)));
    }
    do {
      await new Promise(resolve => setTimeout(resolve, 10));
      await this.deliverAllMessages();
    } while(this.semaphoreService.getQueueLength() > 0 && !this.gettingBored());
    await new Promise(r => setTimeout(r, 1200));
    const nums = this.workers.map((worker) => worker.getNumProbes());
    this.semaphoreService.shutdown();
    let cumm = 0;
    for (let i = 0; i < nums.length; i++) {
      cumm += nums[i];
    }
    return cumm;
  }
  async solutionIsComplete(): Promise<boolean> {
    // console.log(this.solution);
    return true;
  }
  public getStats(): {
    messagesReceived: number;
    messagesSent: number;
    transfersReceived: number;
    transfersSent: number;
    transferAmount: number;
    bilateralNum: number;
    bilateralAmount: number;
    multilateralNum: number;
    multilateralAmount: number;
    numNodes: number;
  } {
    const stats: {
      messagesReceived: number;
      messagesSent: number;
      transfersReceived: number;
      transfersSent: number;
      transferAmount: number;
      bilateralNum: number;
      bilateralAmount: number;
      multilateralNum: number;
      multilateralAmount: number;
      numNodes: number;
    } = {
      messagesReceived: 0,
      messagesSent: 0,
      transfersReceived: 0,
      transfersSent: 0,
      transferAmount: 0,
      bilateralNum: 0,
      bilateralAmount: 0,
      multilateralNum: 0,
      multilateralAmount: 0,
      numNodes: 0,
    };
    this.workers.forEach(worker => {
      const workerStats = worker.getOurStats();
      stats.messagesReceived += workerStats.messagesReceived;
      stats.messagesSent += workerStats.messagesSent;
      stats.transfersReceived += workerStats.transfersReceived;
      stats.transfersSent += workerStats.transfersSent;
      stats.transferAmount += workerStats.transferAmount;
      stats.bilateralNum += workerStats.bilateralNum / 2;
      stats.bilateralAmount += workerStats.bilateralAmount / 2;
      stats.multilateralNum += workerStats.multilateralNum;
      stats.multilateralAmount += workerStats.multilateralAmount;
      stats.numNodes += workerStats.numNodes;
    });
    return stats;
  }
}
