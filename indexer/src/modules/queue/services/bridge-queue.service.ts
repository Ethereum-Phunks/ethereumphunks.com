import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue, OnQueueActive, OnQueueCompleted, OnQueueError, OnQueueFailed, OnQueuePaused, OnQueueResumed, OnQueueWaiting, Process, Processor } from '@nestjs/bull';

import { Job, Queue } from 'bull';

import dotenv from 'dotenv';
import { MintService } from '@/modules/bridge/services/mint.service';
dotenv.config();

const chain: 'mainnet' | 'sepolia' = process.env.CHAIN_ID === '1' ? 'mainnet' : 'sepolia';

@Injectable()
@Processor(`bridgeProcessingQueue_${chain}`)
export class BridgeQueueService {

  @Process({ name: `bridgeQueue_${chain}`, concurrency: 1 })
  async handleBlockNumberQueue(job: Job<any>) {
    Logger.debug(`Processing job ${job.id}`);
    // if (!Number(process.env.QUEUE)) return;
    const { hashId, owner } = job.data;

    await this.mintSvc.processLayer2Mint(hashId, owner);
  }

  @OnQueueCompleted({ name: `bridgeQueue_${chain}` })
  async onCompleted(job: Job<any>) {
    // if (!Number(process.env.QUEUE)) return;
    Logger.debug(`Completed job ${job.id}`);
  }

  @OnQueueFailed({ name: `bridgeQueue_${chain}` })
  async onBlockFailed(job: Job<any>, error: Error) {
    // if (!Number(process.env.QUEUE)) return;

    Logger.error('❌', `Failed job ${job.id} with error ${error}`);
    // this.queue.pause();
    // await this.processSvc.retryBlock(job.data.blockNum);
    // this.queue.resume();
  }

  @OnQueueError({ name: `bridgeQueue_${chain}` })
  async onBlockError(error: Error) {
    // Logger.error(`Error ${error}`);
  }

  @OnQueueActive({ name: `bridgeQueue_${chain}` })
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
    @InjectQueue(`bridgeProcessingQueue_${chain}`) private readonly queue: Queue,
    private mintSvc: MintService
  ) {}
}
