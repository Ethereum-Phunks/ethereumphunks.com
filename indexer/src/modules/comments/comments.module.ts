import { Module } from '@nestjs/common';

import { CommentsService } from './comments.service';

import { SharedModule } from '@/modules/shared/shared.module';
import { StorageModule } from '@/modules/storage/storage.module';

@Module({
  imports: [
    SharedModule,
    StorageModule,
  ],
  providers: [
    CommentsService,
  ],
  exports: [
    CommentsService
  ],
})
export class CommentsModule {}
