import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { SharedModule } from '@/modules/shared/shared.module';

import { TelegramService } from '@/modules/notifs/services/telegram.service';
import { DiscordService } from '@/modules/notifs/services/discord.service';
import { ImageService } from '@/modules/notifs/services/image.service';

import { NotifsService } from './notifs.service';
import { NotifsController } from './notifs.controller';
import { TwitterService } from './services/twitter.service';

import { StorageModule } from '@/modules/storage/storage.module';

@Module({
  controllers: [
    NotifsController
  ],
  imports: [
    HttpModule,
    SharedModule,
    StorageModule,
  ],
  providers: [
    NotifsService,

    TelegramService,
    DiscordService,
    ImageService,
    TwitterService,
  ],
  exports: [
    NotifsService,
    TelegramService,
  ]
})
export class NotifsModule {}
