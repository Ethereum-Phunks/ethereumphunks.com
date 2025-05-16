import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';

import { EthscriptionsMintService } from './ethscriptions-mint.service';
import { EthscriptionsMintController } from './ethscriptions-mint.controller';
import { IPThrottlerGuard } from './guards/ip-throttle.guard';

import { SharedModule } from '@/modules/shared/shared.module';
import { TxPoolModule } from '@/modules/tx-pool/tx-pool.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { AppConfigModule } from '@/config/config.module';

import { DataService } from '@/modules/shared/services/data.service';

@Module({
  controllers: [
    EthscriptionsMintController,
  ],
  imports: [
    ThrottlerModule.forRoot([{
      name: 'mint',
      ttl: seconds(30),
      limit: 60,
    }]),
    AppConfigModule,
    SharedModule,
    TxPoolModule,
    HttpModule,
    StorageModule,
  ],
  providers: [
    EthscriptionsMintService,
    DataService,
    {
      provide: APP_GUARD,
      useClass: IPThrottlerGuard,
    },
  ],
})
export class EthscriptionsMintModule {}
