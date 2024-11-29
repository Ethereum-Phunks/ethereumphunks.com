import { Controller, Get, Param } from '@nestjs/common';

import { NotifsService } from './notifs.service';

@Controller('notifications')
export class NotifsController {

  constructor(
    private readonly notifsSvc: NotifsService
  ) {}

  @Get('resend/:hashId')
  async resendNotification(@Param('hashId') hashId: string): Promise<void> {
    await this.notifsSvc.handleNotificationFromHashId(hashId);
  }
}
