import { Injectable, Logger } from '@nestjs/common';

import { InjectQueue } from '@nestjs/bull';
import Bull, { Queue } from 'bull';

import dotenv from 'dotenv';
dotenv.config();

const chain: 'mainnet' | 'sepolia' = process.env.CHAIN_ID === '1' ? 'mainnet' : 'sepolia';

@Injectable()
export class BridgeProcessingService {

  constructor(
    @InjectQueue(`bridgeProcessingQueue_${chain}`) private readonly queue: Queue
  ) {}

  async addBridgeToQueue(
    hashId: string,
    owner: string,
    chainId: number
  ) {
    const jobId = `bridge_${hashId}__${chainId}`;
    const maxRetries = 69;

    const existingJob = await this.queue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
      Logger.error('⚠️', `Updated existing job for hashId ${hashId}`);
    }

    await this.queue.add(
      `bridgeQueue_${chain}`,
      { hashId, owner, retryCount: 0, maxRetries, },
      { jobId, removeOnComplete: true, removeOnFail: false, }
    );
    Logger.debug(`Added bridge job to queue`, `${hashId}`);
  }

  async pauseQueue() {
    // pause queue
  }

  async resumeQueue() {
    // resume queue
  }

  async getJobCounts() {
    // get job counts
  }

  async clearQueue() {
    // clear queue
  }
}
