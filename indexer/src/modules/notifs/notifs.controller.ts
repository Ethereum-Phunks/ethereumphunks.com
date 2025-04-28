import { Controller, Post, Param } from '@nestjs/common';

import { NotifsService } from './notifs.service';

@Controller('notifications')
export class NotifsController {

  constructor(
    private readonly notifsSvc: NotifsService
  ) {}

  /**
   * Resends a notification for a specific hash ID
   * @param hashId The transaction hash ID
   * @returns Promise resolving when the notification is sent
   */
  @Post('resend/:hashId')
  async resendNotification(@Param('hashId') hashId: string): Promise<void> {
    await this.notifsSvc.handleNotificationFromHashId(hashId);
  }
}
