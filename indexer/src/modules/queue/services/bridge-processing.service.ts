import { Injectable, Logger } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { l1Chain } from '@/constants/ethereum';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class BridgeProcessingService {

  constructor(
    @InjectQueue(`bridgeProcessingQueue_${l1Chain}`) private readonly bridgeQueue: Queue
  ) {}

  async addBridgeToQueue(
    hashId: string,
    owner: string
  ) {
    const jobId = `bridge_${hashId}__${l1Chain}`;
    const maxRetries = 69;

    const existingJob = await this.bridgeQueue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
      Logger.error('⚠️', `Updated existing job for hashId ${hashId}`);
    }

    await this.bridgeQueue.add(
      `bridgeQueue_${l1Chain}`,
      { hashId, owner, retryCount: 0, maxRetries, },
      { jobId, removeOnComplete: true, removeOnFail: false, }
    );
    Logger.debug(`Added bridge job to queue`, `${hashId}`);
  }

  async pauseQueue() {
    // pause queue
    await this.bridgeQueue.pause();
  }

  async resumeQueue() {
    // resume queue
    await this.bridgeQueue.resume();
  }

  async getJobCounts() {
    // get job counts
    return await this.bridgeQueue.getJobCounts();
  }

  async clearQueue() {
    // clear queue
    await this.bridgeQueue.clean(0, 'completed');
    await this.bridgeQueue.clean(0, 'wait');
    await this.bridgeQueue.clean(0, 'active');
    await this.bridgeQueue.clean(0, 'delayed');
    await this.bridgeQueue.clean(0, 'failed');
    await this.bridgeQueue.clean(0, 'paused');
  }
}
