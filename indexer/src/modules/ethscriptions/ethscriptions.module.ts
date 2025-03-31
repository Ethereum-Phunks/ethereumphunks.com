import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { SharedModule } from '@/modules/shared/shared.module';
import { NotifsModule } from '@/modules/notifs/notifs.module';
import { QueueModule } from '@/modules/queue/queue.module';

import { SupabaseService } from '@/services/supabase.service';
import { DataService } from '@/services/data.service';

import { EthscriptionsController } from './ethscriptions.controller';
import { EthscriptionsService } from './ethscriptions.service';

@Module({
  imports: [
    HttpModule,
    SharedModule,
    NotifsModule,

    forwardRef(() => QueueModule)
  ],
  controllers: [
    EthscriptionsController
  ],
  providers: [
    EthscriptionsService,

    SupabaseService,
    DataService
  ],
  exports: [
    EthscriptionsService
  ]
})
export class EthscriptionsModule {}
