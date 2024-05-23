import { Module, forwardRef } from '@nestjs/common';

import { SharedModule } from '@/modules/shared/shared.module';
import { NotifsModule } from '@/modules/notifs/notifs.module';
import { QueueModule } from '@/modules/queue/queue.module';

import { SupabaseService } from '@/services/supabase.service';

import { EthscriptionsService } from './ethscriptions.service';


@Module({
  imports: [
    SharedModule,
    NotifsModule,

    forwardRef(() => QueueModule)
  ],
  providers: [
    EthscriptionsService,

    SupabaseService,
  ],
  exports: [
    EthscriptionsService
  ]
})
export class EthscriptionsModule {}
