import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, OnQueueActive, OnQueueCompleted, OnQueueError, OnQueueFailed, OnQueuePaused, OnQueueResumed, OnQueueWaiting, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';

import { MintService } from '@/modules/bridge-l1/services/mint.service';

import { BRIDGE_PROCESSING_QUEUE } from '../constants/queue.constants';

@Injectable()
@Processor(BRIDGE_PROCESSING_QUEUE)
export class BridgeQueueService {

  constructor(
    @InjectQueue(BRIDGE_PROCESSING_QUEUE) private readonly bridgeQueue: Queue,
    private mintSvc: MintService
  ) {}

  @Process({ name: 'BridgeQueue', concurrency: 5 })
  async handleBridgeQueue(job: Job<any>) {
    Logger.debug(`Processing job ${job.id}`);

    const { hashId, owner } = job.data;
    await this.mintSvc.processLayer2Mint(hashId, owner);
  }

  @OnQueueCompleted({ name: 'BridgeQueue' })
  async onCompleted(job: Job<any>) {

    Logger.debug(`Completed job ${job.id}`);
  }

  @OnQueueFailed({ name: 'BridgeQueue' })
  async onBlockFailed(job: Job<any>, error: Error) {
    Logger.error('❌', `Failed job ${job.id} with error ${error}`);
    // this.queue.pause();
    // await this.processSvc.retryBlock(job.data.blockNum);
    // this.queue.resume();
  }

  @OnQueueError({ name: 'BridgeQueue' })
  async onBlockError(error: Error) {
    // Logger.error(`Error ${error}`);
  }

  @OnQueueActive({ name: 'BridgeQueue' })
  async onBlockActive(job: Job<any>) {
    // When a job is processing
    // Logger.debug(`Active job ${job.id}`);
  }

  @OnQueuePaused()
  async onPaused() {
    Logger.warn('Queue paused');
  }

  @OnQueueResumed()
  async onResumed() {
    Logger.warn('Queue resumed');
  }

  @OnQueueWaiting()
  async onWaiting(jobId: number | string) {
    // Logger.debug(`Waiting job ${jobId}`);
  }
}
