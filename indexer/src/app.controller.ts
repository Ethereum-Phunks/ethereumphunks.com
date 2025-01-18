import { Body, Controller, Post, Optional } from '@nestjs/common';

import { ProcessingService } from '@/services/processing.service';
import { BlockProcessingQueue } from '@/modules/queue/queues/block-processing.queue';

@Controller('admin')
export class AppController {

  constructor(
    private readonly processingSvc: ProcessingService,
    @Optional() private readonly blockQueue: BlockProcessingQueue,
  ) {}

  /**
   * Reindexes a specific block.
   *
   * @param body - The request body containing the block number.
    * @returns A promise that resolves to the result of re-indexing the block.
   */
  @Post('reindex-block')
  async reindexBlock(@Body() body: { blockNumber: number }): Promise<void> {
    return await this.processingSvc.processBlock(body.blockNumber, false);
  }

  @Post('reindex-transaction')
  async reindexTransaction(@Body() body: { hash: `0x${string}` }): Promise<void> {
    return await this.processingSvc.processSingleTransaction(body.hash);
  }

  /**
   * Pauses the block queue.
   *
    * @returns A promise that resolves when the block queue is paused.
   */
  @Post('pause-block-queue')
  async pauseQueue(): Promise<void> {
    return await this.blockQueue.pauseQueue();
  }

  /**
   * Resumes the block queue.
   *
    * @returns A promise that resolves when the block queue is resumed.
   */
  @Post('resume-block-queue')
  async resumeQueue(): Promise<void> {
    return await this.blockQueue.resumeQueue();
  }
}
