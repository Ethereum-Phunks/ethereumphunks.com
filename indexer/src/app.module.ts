import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { QueueModule } from '@/modules/queue/queue.module';
import { NotifsModule } from '@/modules/notifs/notifs.module';
import { BridgeModule } from '@/modules/bridge/bridge.module';
import { ImageUriService } from '@/modules/bridge/services/image.service';
import { TelegramService } from '@/modules/notifs/services/telegram.service';
import { DiscordService } from '@/modules/notifs/services/discord.service';
import { ImageService } from '@/modules/notifs/services/image.service';
import { MintService } from '@/modules/bridge/services/mint.service';

import { AppService } from '@/app.service';
import { AppController } from '@/app.controller';

import { Web3Service } from '@/services/web3.service';
import { DataService } from '@/services/data.service';
import { SupabaseService } from '@/services/supabase.service';
import { ProcessingService } from '@/services/processing.service';

import { UtilityService } from '@/utils/utility.service';

@Module({
  imports: [
    HttpModule,

    QueueModule,
    BridgeModule,
    NotifsModule,
  ],
  controllers: [
    AppController
  ],
  providers: [
    // App Service handles the main logic of the indexer
    AppService,
    // Web3 Service handles all interactions with the Ethereum network
    Web3Service,
    // Supabase Service handles all interactions with the Supabase database
    SupabaseService,
    // Processing Service handles the logic of processing transactions
    ProcessingService,
    // Data Service handles the logic of processing data
    DataService,
    TelegramService,
    DiscordService,
    ImageService,
    MintService,
    ImageUriService,

    // Utility Service handles utility functions
    UtilityService
  ],
})

export class AppModule {}
