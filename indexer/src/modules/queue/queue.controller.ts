import { Controller, Post } from '@nestjs/common';

import { BlockProcessingQueue } from './queues/block-processing.queue';

@Controller('queue')
export class QueueController {

  constructor(
    private readonly blockQueue: BlockProcessingQueue
  ) {}

  /**
   * Pauses the block queue.
   *
    * @returns A promise that resolves when the block queue is paused.
   */
  @Post('pause')
  async pauseQueue(): Promise<void> {
    return await this.blockQueue.pauseQueue();
  }

  /**
   * Resumes the block queue.
   *
    * @returns A promise that resolves when the block queue is resumed.
   */
  @Post('resume')
  async resumeQueue(): Promise<void> {
    return await this.blockQueue.resumeQueue();
  }
}
