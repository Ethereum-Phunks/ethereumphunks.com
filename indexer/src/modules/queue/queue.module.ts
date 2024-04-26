import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { BullModule } from '@nestjs/bull';

import { BlockProcessingService } from '@/modules/queue/services/block-processing.service';
import { BlockQueueService } from '@/modules/queue/services/block-queue.service';

import { BridgeProcessingService } from '@/modules/queue/services/bridge-processing.service';
import { BridgeQueueService } from '@/modules/queue/services/bridge-queue.service';

import { TelegramService } from '@/modules/notifs/services/telegram.service';

import { ProcessingService } from '@/services/processing.service';
import { Web3Service } from '@/services/web3.service';
import { SupabaseService } from '@/services/supabase.service';
import { DataService } from '@/services/data.service';

import { TimeService } from '@/utils/time.service';
import { UtilityService } from '@/utils/utility.service';

import { DiscordService } from '@/modules/notifs/services/discord.service';
import { ImageService } from '@/modules/notifs/services/image.service';

import { MintService } from '@/modules/bridge/services/mint.service';
import { ImageUriService } from '@/modules/bridge/services/image.service';

import { l1Chain } from '@/constants/ethereum';

@Module({
  imports: [
    HttpModule,
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379
      }
    }),
    BullModule.registerQueue(
      {
        name: `blockProcessingQueue_${l1Chain}`
      },
      {
        name: `bridgeProcessingQueue_${l1Chain}`
      }
    ),
  ],
  providers: [
    BlockQueueService,
    BlockProcessingService,

    BridgeQueueService,
    BridgeProcessingService,

    ProcessingService,
    MintService,
    Web3Service,
    SupabaseService,
    UtilityService,
    TimeService,
    DataService,
    ImageUriService,

    TelegramService,
    DiscordService,
    ImageService
  ],
  exports: [
    BlockProcessingService,
    BridgeProcessingService,
    TimeService
  ],
})
export class QueueModule {}
