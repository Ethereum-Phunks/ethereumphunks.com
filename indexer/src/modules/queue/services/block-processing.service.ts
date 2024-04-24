// test.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';

import Bull, { Queue } from 'bull';

import dotenv from 'dotenv';
dotenv.config();

const chain: 'mainnet' | 'sepolia' = process.env.CHAIN_ID === '1' ? 'mainnet' : 'sepolia';

@Injectable()
export class BlockProcessingService {

  constructor(
    @InjectQueue(`blockProcessingQueue_${chain}`) private readonly blockQueue: Queue
  ) {}

  async addBlockToQueue(blockNum: number, timestamp: number) {
    const jobId = `block_${blockNum}__${chain}`;
    const maxRetries = 69;

    const existingJob = await this.blockQueue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
      Logger.error('⚠️', `Updated existing job for block ${blockNum}`);
    }

    await this.blockQueue.add(
      `blockNumQueue_${chain}`,
      { blockNum, chain, timestamp, retryCount: 0, maxRetries, },
      { jobId, removeOnComplete: true, removeOnFail: true, }
    );
    if (blockNum % 1000 === 0) Logger.debug(`Added block ${blockNum} to queue`);
  }

  async pauseQueue() {
    await this.blockQueue.pause();
  }

  async resumeQueue() {
    await this.blockQueue.resume();
  }

  async getJobCounts(): Promise<Bull.JobCounts> {
    return await this.blockQueue.getJobCounts();
  }

  async clearQueue(): Promise<void> {
    await this.blockQueue.clean(0, 'completed');
    await this.blockQueue.clean(0, 'wait');
    await this.blockQueue.clean(0, 'active');
    await this.blockQueue.clean(0, 'delayed');
    await this.blockQueue.clean(0, 'failed');
    await this.blockQueue.clean(0, 'paused');
  }
}
