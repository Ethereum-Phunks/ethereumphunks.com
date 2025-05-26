import { Module } from '@nestjs/common';

import { AppConfigModule } from '@/config/config.module';

import { ProcessingService } from './services/processing.service';
import { NftService } from './services/nft.service';

import { SharedModule } from '@/modules/shared/shared.module';
import { UtilityService } from '@/modules/shared/services/utility.service';
import { StorageModule } from '@/modules/storage/storage.module';
import { EvmModule } from '@/modules/evm/evm.module';

@Module({
  imports: [
    AppConfigModule,
    SharedModule,
    StorageModule,
    EvmModule,
  ],
  providers: [
    ProcessingService,
    NftService,

    UtilityService,
  ],
  exports: [],
})
export class BridgeL2Module {}
