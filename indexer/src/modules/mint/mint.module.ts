import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';

import { MintService } from './mint.service';
import { MintController } from './mint.controller';
import { IPThrottlerGuard } from './guards/ip-throttle.guard';

import { SharedModule } from '@/modules/shared/shared.module';
import { TxPoolModule } from '@/modules/tx-pool/tx-pool.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { DataService } from '@/services/data.service';
@Module({
  controllers: [
    MintController,
  ],
  imports: [
    ThrottlerModule.forRoot([{
      name: 'mint',
      ttl: seconds(30),
      limit: 60,
    }]),
    SharedModule,
    TxPoolModule,
    HttpModule,
    StorageModule,
  ],
  providers: [
    MintService,
    DataService,
    {
      provide: APP_GUARD,
      useClass: IPThrottlerGuard,
    },
  ],
})
export class MintModule {}
