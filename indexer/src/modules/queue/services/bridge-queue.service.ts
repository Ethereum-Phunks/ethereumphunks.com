import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, OnQueueActive, OnQueueCompleted, OnQueueError, OnQueueFailed, OnQueuePaused, OnQueueResumed, OnQueueWaiting, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';

import { MintService } from '@/modules/bridge-l1/services/mint.service';
import { chain } from '@/constants/ethereum';

@Injectable()
@Processor(`${chain}__BridgeProcessingQueue`)
export class BridgeQueueService {

  @Process({ name: `${chain}__BridgeQueue`, concurrency: 5 })
  async handleBridgeQueue(job: Job<any>) {
    Logger.debug(`Processing job ${job.id}`);
    // if (!Number(process.env.QUEUE)) return;
    const { hashId, owner } = job.data;
    await this.mintSvc.processLayer2Mint(hashId, owner);
  }

  @OnQueueCompleted({ name: `${chain}__BridgeQueue` })
  async onCompleted(job: Job<any>) {
    // if (!Number(process.env.QUEUE)) return;
    Logger.debug(`Completed job ${job.id}`);
  }

  @OnQueueFailed({ name: `${chain}__BridgeQueue` })
  async onBlockFailed(job: Job<any>, error: Error) {
    // if (!Number(process.env.QUEUE)) return;

    Logger.error('❌', `Failed job ${job.id} with error ${error}`);
    // this.queue.pause();
    // await this.processSvc.retryBlock(job.data.blockNum);
    // this.queue.resume();
  }

  @OnQueueError({ name: `${chain}__BridgeQueue` })
  async onBlockError(error: Error) {
    // Logger.error(`Error ${error}`);
  }

  @OnQueueActive({ name: `${chain}__BridgeQueue` })
  async onBlockActive(job: Job<any>) {
    // When a job is processing
    // Logger.debug(`Active job ${job.id}`);
  }

  @OnQueuePaused()
  async onPaused() {
    // if (!Number(process.env.QUEUE)) return;

    Logger.warn('Queue paused');
  }

  @OnQueueResumed()
  async onResumed() {
    // if (!Number(process.env.QUEUE)) return;

    Logger.warn('Queue resumed');
  }

  @OnQueueWaiting()
  async onWaiting(jobId: number | string) {
    // Logger.debug(`Waiting job ${jobId}`);
  }

  constructor(
    @InjectQueue(`${chain}__BridgeProcessingQueue`) private readonly bridgeQueue: Queue,
    private mintSvc: MintService
  ) {}
}
