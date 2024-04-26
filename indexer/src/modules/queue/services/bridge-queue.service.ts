import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, OnQueueActive, OnQueueCompleted, OnQueueError, OnQueueFailed, OnQueuePaused, OnQueueResumed, OnQueueWaiting, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';

import { MintService } from '@/modules/bridge/services/mint.service';
import { l1Chain } from '@/constants/ethereum';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
@Processor(`bridgeProcessingQueue_${l1Chain}`)
export class BridgeQueueService {

  @Process({ name: `bridgeQueue_${l1Chain}`, concurrency: 1 })
  async handleBlockNumberQueue(job: Job<any>) {
    Logger.debug(`Processing job ${job.id}`);
    // if (!Number(process.env.QUEUE)) return;
    const { hashId, owner } = job.data;

    await this.mintSvc.processLayer2Mint(hashId, owner);
  }

  @OnQueueCompleted({ name: `bridgeQueue_${l1Chain}` })
  async onCompleted(job: Job<any>) {
    // if (!Number(process.env.QUEUE)) return;
    Logger.debug(`Completed job ${job.id}`);
  }

  @OnQueueFailed({ name: `bridgeQueue_${l1Chain}` })
  async onBlockFailed(job: Job<any>, error: Error) {
    // if (!Number(process.env.QUEUE)) return;

    Logger.error('❌', `Failed job ${job.id} with error ${error}`);
    // this.queue.pause();
    // await this.processSvc.retryBlock(job.data.blockNum);
    // this.queue.resume();
  }

  @OnQueueError({ name: `bridgeQueue_${l1Chain}` })
  async onBlockError(error: Error) {
    // Logger.error(`Error ${error}`);
  }

  @OnQueueActive({ name: `bridgeQueue_${l1Chain}` })
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
    @InjectQueue(`bridgeProcessingQueue_${l1Chain}`) private readonly queue: Queue,
    private mintSvc: MintService
  ) {}
}
