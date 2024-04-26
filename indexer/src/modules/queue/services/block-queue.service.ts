import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, OnQueueActive, OnQueueCompleted, OnQueueError, OnQueueEvent, OnQueueFailed, OnQueuePaused, OnQueueResumed, OnQueueWaiting, Process, Processor } from '@nestjs/bull';

// import { UtilityService } from '@/services/utility.service';
import { ProcessingService } from '@/services/processing.service';
import { UtilityService } from '@/utils/utility.service';

import { l1Chain } from '@/constants/ethereum';

import { Job, Queue } from 'bull';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
@Processor(`blockProcessingQueue_${l1Chain}`)
export class BlockQueueService {

  @Process({ name: `blockNumQueue_${l1Chain}`, concurrency: 1 })
  async handleBlockNumberQueue(job: Job<any>) {
    if (!Number(process.env.QUEUE)) return;

    const { blockNum } = job.data;
    await this.processSvc.processBlock(blockNum);
  }

  @OnQueueCompleted({ name: `blockNumQueue_${l1Chain}` })
  async onCompleted(job: Job<any>) {
    if (!Number(process.env.QUEUE)) return;
    // Logger.debug(`Completed job ${job.id}`);
  }

  @OnQueueFailed({ name: `blockNumQueue_${l1Chain}` })
  async onBlockFailed(job: Job<any>, error: Error) {
    if (!Number(process.env.QUEUE)) return;

    Logger.error('❌', `Failed job ${job.id} with error ${error}`);
    this.queue.pause();
    await this.processSvc.retryBlock(job.data.blockNum);
    this.queue.resume();
  }

  @OnQueueError({ name: `blockNumQueue_${l1Chain}` })
  async onBlockError(error: Error) {
    // Logger.error(`Error ${error}`);
  }

  @OnQueueActive({ name: `blockNumQueue_${l1Chain}` })
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
    @InjectQueue(`blockProcessingQueue_${l1Chain}`) private readonly queue: Queue,
    private readonly utilSvc: UtilityService,
    private readonly processSvc: ProcessingService
    // private readonly appSvc: AppService
  ) {}
}
