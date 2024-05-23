import { Injectable } from '@nestjs/common';

import { Event } from '@/models/db';

import { DiscordService } from './services/discord.service';

import { SupabaseService } from '@/services/supabase.service';

@Injectable()
export class NotifsService {

  constructor(
    private readonly discordSvc: DiscordService,
    private readonly sbSvc: SupabaseService
  ) {}

  async handleNotificationsFromEvents(events: Event[]): Promise<void> {
    await this.discordSvc.postMessage(events);
  }

  async handleNotificationFromHashId(hashId: string): Promise<void> {
    const event = await this.sbSvc.getEventByHashId(hashId);
    await this.discordSvc.postMessage([event]);

  }

}
