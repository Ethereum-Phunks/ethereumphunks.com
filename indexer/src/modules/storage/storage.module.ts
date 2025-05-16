import { Module } from '@nestjs/common';

import { AppConfigModule } from '@/config/config.module';
import { StorageService } from './storage.service';

@Module({
  imports: [
    AppConfigModule,
  ],
  providers: [
    StorageService,
  ],
  exports: [
    StorageService,
  ],
})
export class StorageModule {}
