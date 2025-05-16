import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AppConfigModule } from '@/config/config.module';

import { SharedModule } from '@/modules/shared/shared.module';
import { NotifsModule } from '@/modules/notifs/notifs.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { StorageModule } from '@/modules/storage/storage.module';

import { EthscriptionsController } from './ethscriptions.controller';
import { EthscriptionsService } from './ethscriptions.service';
import { ConditionalModule } from '@nestjs/config';

@Module({
  imports: [
    AppConfigModule,

    HttpModule,
    SharedModule,
    NotifsModule,
    StorageModule,

    ConditionalModule.registerWhen(
      forwardRef(() => QueueModule),
      (config) => (!!Number(config['QUEUE']))
    ),
  ],
  controllers: [
    EthscriptionsController
  ],
  providers: [
    EthscriptionsService
  ],
  exports: [
    EthscriptionsService
  ]
})
export class EthscriptionsModule {}
