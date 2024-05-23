import { Module, forwardRef } from '@nestjs/common';
import { NftService } from './nft.service';
import { SupabaseService } from '@/services/supabase.service';
import { UtilityService } from '../shared/services/utility.service';
import { SharedModule } from '../shared/shared.module';

// import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    SharedModule,
    // forwardRef(() => QueueModule)
  ],
  providers: [
    NftService,

    SupabaseService,
    UtilityService
  ],
  exports: [
    NftService
  ]
})
export class NftModule {}

