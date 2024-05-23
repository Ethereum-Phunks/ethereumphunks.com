import { Module } from '@nestjs/common';

import { ProcessingService } from './services/processing.service';
import { SupabaseService } from '@/services/supabase.service';
import { UtilityService } from '../shared/services/utility.service';

@Module({
  providers: [
    ProcessingService,

    SupabaseService,
    UtilityService,
  ],
  exports: [],
})
export class BridgeL2Module {}
