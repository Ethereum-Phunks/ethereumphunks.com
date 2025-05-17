import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';

import { NftModule } from '@/modules/nft/nft.module';
import { SharedModule } from '@/modules/shared/shared.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { CommentsModule } from '@/modules/comments/comments.module';
import { BridgeL1Module } from '@/modules/bridge-l1/bridge-l1.module';
import { EthscriptionsModule } from '@/modules/ethscriptions/ethscriptions.module';
import { NotifsModule } from '@/modules/notifs/notifs.module';
import { ProcessingModule } from '@/modules/processing/processing.module';
import { AppConfigModule } from '@/config/config.module';

import { BlockQueueService } from '@/modules/queue/services/block-queue.service';
import { BridgeQueueService } from '@/modules/queue/services/bridge-queue.service';
import { AppConfigService } from '@/config/config.service';

import { BlockProcessingQueue } from '@/modules/queue/queues/block-processing.queue';
import { BridgeProcessingQueue } from '@/modules/queue/queues/bridge-processing.queue';

import { BLOCK_PROCESSING_QUEUE, BRIDGE_PROCESSING_QUEUE } from './constants/queue.constants';

@Module({
  imports: [
    AppConfigModule,
    HttpModule,
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: async (configService: AppConfigService) => ({
        redis: {
          host: 'localhost',
          port: 6379,
        },
        prefix: `chain:${configService.chain.chainIdL1}`,
      }),
      inject: [AppConfigService],
    }),
    BullModule.registerQueue(
      {
        name: BLOCK_PROCESSING_QUEUE,
      },
      {
        name: BRIDGE_PROCESSING_QUEUE,
      }
    ),
    SharedModule,
    BridgeL1Module,
    NftModule,
    StorageModule,
    NotifsModule,
    ProcessingModule,
    forwardRef(() => EthscriptionsModule),
    forwardRef(() => CommentsModule),
  ],
  providers: [
    {
      provide: BlockProcessingQueue,
      useFactory: (queue: Queue, configSvc: AppConfigService) => {
        return new BlockProcessingQueue(queue, configSvc);
      },
      inject: [getQueueToken(BLOCK_PROCESSING_QUEUE), AppConfigService],
    },
    {
      provide: BridgeProcessingQueue,
      useFactory: (queue: Queue, configSvc: AppConfigService) => {
        return new BridgeProcessingQueue(queue, configSvc);
      },
      inject: [getQueueToken(BRIDGE_PROCESSING_QUEUE), AppConfigService],
    },

    BlockQueueService,
    BridgeQueueService,
  ],
  exports: [
    BlockProcessingQueue,
    BridgeProcessingQueue,
  ],
})
export class QueueModule {}

