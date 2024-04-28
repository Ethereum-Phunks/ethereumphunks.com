import { Body, Controller, Post } from '@nestjs/common';

import { ProcessingServiceL1 } from './services/processing.service';
import { BlockProcessingService } from './modules/queue/services/block-processing.service';

@Controller()
export class AppController {

  constructor(
    private readonly processingSvc: ProcessingServiceL1,
    private readonly queue: BlockProcessingService,
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

  /**
   * Pauses the block queue.
   *
    * @returns A promise that resolves when the block queue is paused.
   */
  @Post('pause-block-queue')
  async pauseQueue(): Promise<void> {
    return await this.queue.pauseQueue();
  }

  /**
   * Resumes the block queue.
   *
    * @returns A promise that resolves when the block queue is resumed.
   */
  @Post('resume-block-queue')
  async resumeQueue(): Promise<void> {
    return await this.queue.resumeQueue();
  }
}
