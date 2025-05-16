import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, OnQueueActive, OnQueueCompleted, OnQueueError, OnQueueFailed, OnQueuePaused, OnQueueResumed, OnQueueWaiting, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';

import { BLOCK_PROCESSING_QUEUE } from '../constants/queue.constants';

import { ProcessingService } from '@/modules/processing/processing.service';

@Injectable()
@Processor(BLOCK_PROCESSING_QUEUE)
export class BlockQueueService {

  constructor(
    @InjectQueue(BLOCK_PROCESSING_QUEUE) private readonly blockQueue: Queue,
    private readonly processSvc: ProcessingService
  ) {}

  @Process({ name: 'BlockNumQueue', concurrency: 1 })
  async handleBlockNumberQueue(job: Job<any>) {
    const { blockNum } = job.data;
    await this.processSvc.processBlock(blockNum);
  }

  @OnQueueCompleted({ name: 'BlockNumQueue' })
  async onCompleted(job: Job<any>) {
    // Logger.debug(`Completed job ${job.id}`);
  }

  @OnQueueFailed({ name: 'BlockNumQueue' })
  async onBlockFailed(job: Job<any>, error: Error) {
    const { blockNum } = job.data;

    Logger.error('❌', `Failed job ${job.id} with error ${error}`);
    this.blockQueue.pause();

    await this.processSvc.retryBlock(blockNum);
    this.blockQueue.resume();
  }

  @OnQueueError({ name: 'BlockNumQueue' })
  async onBlockError(error: Error) {
    // Logger.error(`Error ${error}`);
  }

  @OnQueueActive({ name: 'BlockNumQueue' })
  async onBlockActive(job: Job<any>) {
    // When a job is proccessing
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
