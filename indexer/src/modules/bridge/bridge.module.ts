import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';

import { BridgeController } from '@/modules/bridge/bridge.controller';

import { NonceService } from '@/modules/bridge/services/nonce.service';
import { MintService } from '@/modules/bridge/services/mint.service';
import { ImageUriService } from '@/modules/bridge/services/image.service';
import { VerificationService } from '@/modules/bridge/services/verification.service';

import { SupabaseService } from '@/services/supabase.service';
import { Web3Service } from '@/services/web3.service';

@Module({
  imports: [
    HttpModule,
    CacheModule.register(),
  ],
  controllers: [
    BridgeController
  ],
  providers: [
    NonceService,
    VerificationService,
    SupabaseService,
    Web3Service,
    MintService,
    ImageUriService
  ],
  exports: [],
})
export class BridgeModule {}
