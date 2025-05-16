import { Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';

import { BlockProcessingQueue } from '@/modules/queue/queues/block-processing.queue';
import { BridgeProcessingQueue } from '@/modules/queue/queues/bridge-processing.queue';

import { StorageService } from '@/modules/storage/storage.service';
import { AppConfigService } from '@/config/config.service';

import { UtilityService } from '@/modules/shared/services/utility.service';
import { Web3Service } from '@/modules/shared/services/web3.service';
import { EvmService } from '@/modules/evm/evm.service';
@Injectable()
export class AppService implements OnModuleInit {

  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3SvcL1: Web3Service,
    @Optional() private readonly blockQueue: BlockProcessingQueue,
    @Optional() private readonly bridgeQueue: BridgeProcessingQueue,
    private readonly storageSvc: StorageService,
    private readonly utilSvc: UtilityService,
    private readonly configSvc: AppConfigService,
    private readonly evmSvc: EvmService
  ) {}

  async onModuleInit() {
    if (this.configSvc.features.queue) {
      // Clear the queue
      await Promise.all([
        this.blockQueue.clearQueue(),
        this.bridgeQueue.clearQueue()
      ]);
      Logger.debug('Queue Cleared');

      // Start the indexer
      this.startIndexer().catch(console.error);
    }
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
      await this.blockQueue.pauseQueue();

      const startBlock = (await this.storageSvc.getLastBlock(this.configSvc.chain.chainIdL1));
      await this.startBackfill(startBlock);
      await this.blockQueue.resumeQueue();
      await this.startPolling();

    } catch (error) {
      Logger.error(error);
      this.startIndexer();
    }
  }

  /**
   * Starts the backfill process from a specified block number.
   *
   * @param startBlock - The block number to start the backfill from.
   * @returns A Promise that resolves when the backfill process is complete.
   * @throws An error if the start block is greater than the latest block.
   */
  async startBackfill(startBlock: number): Promise<void> {
    const latestBlock = await this.web3SvcL1.getBlock({});

    Logger.debug('Starting Backfill');

    const latestBlockNum = Number(latestBlock.number);
    if (startBlock > latestBlockNum) throw new Error('RPC Error: Start block is greater than latest block');

    while (startBlock < latestBlockNum) {
      await this.addBlockToQueue(startBlock, new Date().getTime());
      startBlock++;
    }
  }

  /**
   * Starts polling for new blocks and adds them to the queue.
   *
   * @returns A promise that resolves when the polling is started.
   * @throws If an error occurs while polling.
   */
  async startPolling(): Promise<void> {
    Logger.debug('Starting Block Watcher');

    return new Promise((resolve, reject) => {
      // Watch for new blocks and add them to the queue
      const unwatch = this.evmSvc.publicClientL1.watchBlocks({
        // blockTag: 'safe',
        emitOnBegin: true,
        emitMissed: true,
        includeTransactions: false,
        onBlock: async (block) => {
          try {
            const blockNum = Number(block.number);
            const timestamp = new Date(Number(block.timestamp) * 1000).getTime();
            await this.addBlockToQueue(blockNum, timestamp);
          } catch (error) {
            unwatch();
            reject(error); // Reject the promise on error
          }
        },
        onError: (error) => {
          console.log(error);
          unwatch(); // Unwatch the blocks
          reject(error); // Reject the promise on error
        }
      });
    });
  }

  /**
   * Adds a block to the processing queue.
   *
   * @param blockNum - The block number to add to the queue.
   * @param blockTimestamp - The timestamp of the block to add to the queue.
   * @returns A Promise that resolves when the block is added to the queue.
   */
  async addBlockToQueue(
    blockNum: number,
    blockTimestamp: number
  ): Promise<void> {
    await this.blockQueue.addBlockToQueue(blockNum, blockTimestamp);
  }
}
