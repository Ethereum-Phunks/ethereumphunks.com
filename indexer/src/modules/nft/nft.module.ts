import { Module, forwardRef } from '@nestjs/common';
import { NftService } from './nft.service';

import { UtilityService } from '@/modules/shared/services/utility.service';
import { SharedModule } from '@/modules/shared/shared.module';
import { StorageModule } from '@/modules/storage/storage.module';

@Module({
  imports: [
    SharedModule,
    StorageModule,
  ],
  providers: [
    NftService,
    UtilityService
  ],
  exports: [
    NftService
  ]
})
export class NftModule {}

