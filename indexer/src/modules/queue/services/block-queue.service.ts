import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, OnQueueActive, OnQueueCompleted, OnQueueError, OnQueueFailed, OnQueuePaused, OnQueueResumed, OnQueueWaiting, Process, Processor } from '@nestjs/bull';

// import { UtilityService } from '@/services/utility.service';
import { ProcessingService } from '@/services/processing.service';

import { chain } from '@/constants/ethereum';

import { Job, Queue } from 'bull';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
@Processor(`${chain}__BlockProcessingQueue`)
export class BlockQueueService {

  @Process({ name: `${chain}__BlockNumQueue`, concurrency: 1 })
  async handleBlockNumberQueue(job: Job<any>) {
    if (!Number(process.env.QUEUE)) return;

    const { blockNum } = job.data;
    await this.processSvc.processBlock(blockNum);
  }

  @OnQueueCompleted({ name: `${chain}__BlockNumQueue` })
  async onCompleted(job: Job<any>) {
    if (!Number(process.env.QUEUE)) return;
    // Logger.debug(`Completed job ${job.id}`);
  }

  @OnQueueFailed({ name: `${chain}__BlockNumQueue` })
  async onBlockFailed(job: Job<any>, error: Error) {
    if (!Number(process.env.QUEUE)) return;

    const { blockNum } = job.data;

    Logger.error('❌', `Failed job ${job.id} with error ${error}`);
    this.blockQueue.pause();

    await this.processSvc.retryBlock(blockNum);
    this.blockQueue.resume();
  }

  @OnQueueError({ name: `${chain}__BlockNumQueue` })
  async onBlockError(error: Error) {
    // Logger.error(`Error ${error}`);
  }

  @OnQueueActive({ name: `${chain}__BlockNumQueue` })
  async onBlockActive(job: Job<any>) {
    // When a job is proccessing
    // Logger.debug(`Active job ${job.id}`);
  }

  @OnQueuePaused()
  async onPaused() {
    if (!Number(process.env.QUEUE)) return;

    Logger.warn('Queue paused');
  }

  @OnQueueResumed()
  async onResumed() {
    if (!Number(process.env.QUEUE)) return;

    Logger.warn('Queue resumed');
  }

  @OnQueueWaiting()
  async onWaiting(jobId: number | string) {
    // Logger.debug(`Waiting job ${jobId}`);
  }

  constructor(
    @InjectQueue(`${chain}__BlockProcessingQueue`) private readonly blockQueue: Queue,
    private readonly processSvc: ProcessingService
    // private readonly appSvc: AppService
  ) {}
}
