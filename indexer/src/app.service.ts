import { Injectable, Logger } from '@nestjs/common';

import { BlockProcessingService } from '@/modules/queue/services/block-processing.service';

import { SupabaseService } from '@/services/supabase.service';
import { ProcessingService } from '@/services/processing.service';

import { UtilityService } from '@/utils/utility.service';
import { l1Chain } from './constants/ethereum';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AppService {

  constructor(
    private readonly blockSvc: BlockProcessingService,
    private readonly processSvc: ProcessingService,
    private readonly sbSvc: SupabaseService,
    private readonly utilSvc: UtilityService
  ) {
    this.blockSvc.clearQueue().then(() => {
      Logger.debug('Queue Cleared', l1Chain.toUpperCase());
      this.startIndexer();
    });
  }

  /**
   * Starts the indexer process.
   *
   * @returns A promise that resolves when the indexer process is started.
   * @description This function starts the indexer process by clearing the queue, starting the backfill, and starting the block watcher. If an error occurs, the function will restart the indexer process.
   */
  async startIndexer(): Promise<void> {
    try {
      await this.utilSvc.delay(10000);
      await this.blockSvc.pauseQueue();

      const startBlock = (await this.sbSvc.getLastBlock(Number(process.env.CHAIN_ID)));

      Logger.debug('Starting Backfill', l1Chain.toUpperCase());
      await this.processSvc.startBackfill(startBlock);
      await this.blockSvc.resumeQueue();

      Logger.debug('Starting Block Watcher', l1Chain.toUpperCase());
      await this.processSvc.startPolling();

    } catch (error) {
      Logger.error(error);
      this.startIndexer();
    }
  }
}

// this.bridgeSvc.addBridgeToQueue(
//   '0xeca65bfbdffbbe9274911599351d12df8575a95da14d65719e3d6da3b1fd65d5',
//   '0xf1aa941d56041d47a9a18e99609a047707fe96c7',
//   Number(process.env.CHAIN_ID)
// );

// this.mintSvc.createMintRequest(
//   '0xfbb90d955f2ad3e3a0e77ac6fce322e3fff60ff6684b872b26c2b81f5daf4031',
//   '0xf1aa941d56041d47a9a18e99609a047707fe96c7'
// ).then((req) => {
//   // console.log(req);
// });

// this.mintSvc.validateTokenMint(
//   '0xa9080447f05810063ec35075898aa5813b53b8866ba5e509199bd5cb7883fe24'
// );
