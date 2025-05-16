// test.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';

import Bull, { Queue } from 'bull';

import { AppConfigService } from '@/config/config.service';

import { BLOCK_PROCESSING_QUEUE } from '../constants/queue.constants';

@Injectable()
export class BlockProcessingQueue {

  constructor(
    @InjectQueue(BLOCK_PROCESSING_QUEUE) private readonly queue: Queue,
    private readonly configSvc: AppConfigService,
  ) {}

  async addBlockToQueue(
    blockNum: number,
    timestamp: number,
  ) {
    const jobId = `block_${blockNum}`;
    const maxRetries = 69;

    const existingJob = await this.queue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
      Logger.warn('⚠️', `Updated existing job [${jobId}]`);
    }

    await this.queue.add(
      'BlockNumQueue',
      { blockNum, chain: this.configSvc.chain.chainIdL1, timestamp, retryCount: 0, maxRetries },
      { jobId, removeOnComplete: true, removeOnFail: true }
    );

    if (blockNum % 1000 === 0) Logger.debug(`Added block ${blockNum} to queue`);
  }

  async pauseQueue(): Promise<void> {
    await this.queue.pause();
  }

  async resumeQueue() {
    await this.queue.resume();
  }

  async getJobCounts(): Promise<Bull.JobCounts> {
    return await this.queue.getJobCounts();
  }

  async clearQueue(): Promise<void> {
    await this.queue.clean(0, 'completed');
    await this.queue.clean(0, 'wait');
    await this.queue.clean(0, 'active');
    await this.queue.clean(0, 'delayed');
    await this.queue.clean(0, 'failed');
    await this.queue.clean(0, 'paused');
  }
}
