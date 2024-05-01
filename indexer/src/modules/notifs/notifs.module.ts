import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { TelegramService } from '@/modules/notifs/services/telegram.service';
import { DiscordService } from '@/modules/notifs/services/discord.service';
import { ImageService } from '@/modules/notifs/services/image.service';

import { Web3Service } from '@/services/web3.service';
import { SupabaseService } from '@/services/supabase.service';
import { UtilityService } from '@/utils/utility.service';

@Module({
  imports: [
    HttpModule
  ],
  providers: [
    TelegramService,
    DiscordService,
    SupabaseService,
    ImageService,
    Web3Service,
    UtilityService
  ],
})
export class NotifsModule {}
