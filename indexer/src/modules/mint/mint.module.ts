import { Module } from '@nestjs/common';

import { MintService } from './mint.service';
import { MintController } from './mint.controller';

import { SupabaseService } from '@/services/supabase.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  controllers: [
    MintController,
  ],
  imports: [
    SharedModule,
  ],
  providers: [
    MintService,
    SupabaseService,
  ],
})
export class MintModule {}
