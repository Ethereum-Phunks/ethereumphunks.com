import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';

import { SharedModule } from '@/modules/shared/shared.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { BridgeController } from '@/modules/bridge-l1/bridge-l1.controller';

import { NonceService } from '@/modules/bridge-l1/services/nonce.service';
import { MintService } from '@/modules/bridge-l1/services/mint.service';
import { ImageUriService } from '@/modules/bridge-l1/services/image-uri.service';
import { VerificationService } from '@/modules/bridge-l1/services/verification.service';

@Module({
  imports: [
    HttpModule,
    CacheModule.register(),

    SharedModule,
    StorageModule,
  ],
  controllers: [
    BridgeController
  ],
  providers: [
    VerificationService,
    NonceService,
    MintService,
    ImageUriService
  ],
  exports: [
    MintService
  ],
})
export class BridgeL1Module {}
