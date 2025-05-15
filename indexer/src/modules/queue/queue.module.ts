import { Module, forwardRef } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';

import { NftModule } from '@/modules/nft/nft.module';
import { SharedModule } from '@/modules/shared/shared.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { CommentsModule } from '@/modules/comments/comments.module';
import { BridgeL1Module } from '@/modules/bridge-l1/bridge-l1.module';
import { EthscriptionsModule } from '@/modules/ethscriptions/ethscriptions.module';
import { NotifsModule } from '@/modules/notifs/notifs.module';
import { AppConfigModule } from '@/config/config.module';

import { BlockQueueService } from '@/modules/queue/services/block-queue.service';
import { BridgeQueueService } from '@/modules/queue/services/bridge-queue.service';
import { ProcessingService } from '@/modules/processing/processing.service';
import { AppConfigService } from '@/config/config.service';

import { BlockProcessingQueue } from '@/modules/queue/queues/block-processing.queue';
import { BridgeProcessingQueue } from '@/modules/queue/queues/bridge-processing.queue';

import { BLOCK_PROCESSING_QUEUE, BRIDGE_PROCESSING_QUEUE } from './constants/queue.constants';
import { Queue } from 'bull';

@Module({
  imports: [
    AppConfigModule,
    HttpModule,
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379
      }
    }),
    BullModule.registerQueueAsync(
      {
        name: BLOCK_PROCESSING_QUEUE,
        imports: [AppConfigModule],
        useFactory: (configSvc: AppConfigService) => ({
          name: `${configSvc.chain.chainIdL1}__BlockProcessingQueue`,
        }),
        inject: [AppConfigService],
      },
      {
        name: BRIDGE_PROCESSING_QUEUE,
        imports: [AppConfigModule],
        useFactory: (configSvc: AppConfigService) => ({
          name: `${configSvc.chain.chainIdL1}__BridgeProcessingQueue`,
        }),
        inject: [AppConfigService],
      }
    ),
    SharedModule,
    BridgeL1Module,
    NftModule,
    StorageModule,
    NotifsModule,

    forwardRef(() => EthscriptionsModule),
    forwardRef(() => CommentsModule),
  ],
  providers: [
    {
      provide: BlockProcessingQueue,
      useFactory: (queue: Queue, configSvc: AppConfigService) => {
        return new BlockProcessingQueue(queue, configSvc);
      },
      inject: [BLOCK_PROCESSING_QUEUE, AppConfigService],
    },
    {
      provide: BridgeProcessingQueue,
      useFactory: (queue: Queue, configSvc: AppConfigService) => {
        return new BridgeProcessingQueue(queue, configSvc);
      },
      inject: [BRIDGE_PROCESSING_QUEUE, AppConfigService],
    },

    BlockQueueService,
    BridgeQueueService,
    ProcessingService,
  ],
  exports: [
    BlockProcessingQueue,
    BridgeProcessingQueue,
  ],
})
export class QueueModule {}

ConditionalModule.registerWhen(QueueModule, 'QUEUE');

