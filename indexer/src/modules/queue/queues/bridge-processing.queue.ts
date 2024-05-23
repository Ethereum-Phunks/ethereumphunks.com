import { Injectable, Logger } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

import { chain, l2Chain } from '@/constants/ethereum';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class BridgeProcessingQueue {

  constructor(
    @InjectQueue(`${chain}__BridgeProcessingQueue`) private readonly bridgeQueue: Queue
  ) {}

  async addHashLockedToQueue(
    hashId: string,
    owner: string,
  ) {
    const jobId = `${chain}__hash_${hashId}`.toUpperCase();
    const maxRetries = 69;

    const existingJob = await this.bridgeQueue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
      Logger.warn('⚠️', `Updated existing job for hashId ${hashId}`);
    }

    await this.bridgeQueue.add(
      `${chain}__BridgeQueue`,
      { hashId, owner, retryCount: 0, maxRetries, delay: 2000 },
      { jobId, removeOnComplete: true, removeOnFail: false, }
    );
    Logger.debug(`Added bridge job to queue`, `${hashId}`);
  }

  // async addBridgedOutToQueue(
  //   hashId: string,
  //   owner: string
  // ) {
  //   const jobId = `l1Bridge_${hashId}__${l2Chain}`;
  //   const maxRetries = 69;

  //   const existingJob = await this.bridgeQueue.getJob(jobId);
  //   if (existingJob) {
  //     await existingJob.remove();
  //     Logger.error('⚠️', `Updated existing job for hashId ${hashId}`);
  //   }

  //   await this.bridgeQueue.add(
  //     `${chain}__BridgeQueue`,
  //     { hashId, owner, retryCount: 0, maxRetries, },
  //     { jobId, removeOnComplete: true, removeOnFail: false, }
  //   );
  //   Logger.debug(`Added bridge job to queue`, `${hashId}`);
  // }

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
