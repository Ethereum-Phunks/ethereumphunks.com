import { Module } from '@nestjs/common';

import { ProcessingService } from './services/processing.service';
import { UtilityService } from '@/modules/shared/services/utility.service';

import { StorageModule } from '@/modules/storage/storage.module';
import { EvmModule } from '@/modules/evm/evm.module';
import { AppConfigModule } from '@/config/config.module';

@Module({
  imports: [
    StorageModule,
    EvmModule,
    AppConfigModule
  ],
  providers: [
    ProcessingService,

    UtilityService,
  ],
  exports: [],
})
export class BridgeL2Module {}
