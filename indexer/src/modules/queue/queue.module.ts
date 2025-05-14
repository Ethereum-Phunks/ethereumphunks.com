import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';

import { NftModule } from '@/modules/nft/nft.module';
import { SharedModule } from '@/modules/shared/shared.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { CommentsModule } from '@/modules/comments/comments.module';
import { BridgeL1Module } from '@/modules/bridge-l1/bridge-l1.module';
import { BlockQueueService } from '@/modules/queue/services/block-queue.service';
import { EthscriptionsModule } from '@/modules/ethscriptions/ethscriptions.module';
import { BridgeQueueService } from '@/modules/queue/services/bridge-queue.service';
import { BlockProcessingQueue } from '@/modules/queue/queues/block-processing.queue';
import { BridgeProcessingQueue } from '@/modules/queue/queues/bridge-processing.queue';
import { NotifsModule } from '@/modules/notifs/notifs.module';

import { ProcessingService } from '@/modules/processing/processing.service';

import { chain } from '@/constants/ethereum';

@Module({
  imports: [
    ConfigModule.forRoot(),
    HttpModule,
    ...(Number(process.env.QUEUE) ? [
      BullModule.forRoot({
        redis: {
          host: 'localhost',
          port: 6379
        }
      }),
      BullModule.registerQueue(
        {
          name: `${chain}__BlockProcessingQueue`
        },
        {
          name: `${chain}__BridgeProcessingQueue`
        }
      )
    ] : []),
    SharedModule,
    BridgeL1Module,
    NftModule,
    StorageModule,
    NotifsModule,

    forwardRef(() => EthscriptionsModule),
    forwardRef(() => CommentsModule),
  ],
  providers: [
    ...(Number(process.env.QUEUE) ? [
      BlockQueueService,
      BlockProcessingQueue,
      BridgeQueueService,
      BridgeProcessingQueue,
    ] : []),
    ProcessingService,
  ],
  exports: [
    ...(Number(process.env.QUEUE) ? [
      BlockProcessingQueue,
      BridgeProcessingQueue
    ] : []),
  ],
})
export class QueueModule {}
