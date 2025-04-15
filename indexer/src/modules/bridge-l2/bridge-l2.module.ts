import { Module } from '@nestjs/common';

import { ProcessingService } from './services/processing.service';
import { UtilityService } from '@/modules/shared/services/utility.service';

import { StorageModule } from '@/modules/storage/storage.module';

@Module({
  imports: [
    StorageModule,
  ],
  providers: [
    ProcessingService,

    UtilityService,
  ],
  exports: [],
})
export class BridgeL2Module {}
