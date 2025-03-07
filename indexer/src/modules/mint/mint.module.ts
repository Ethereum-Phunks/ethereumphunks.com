import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';

import { MintService } from './mint.service';
import { MintController } from './mint.controller';

import { SupabaseService } from '@/services/supabase.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  controllers: [
    MintController,
  ],
  imports: [
    ThrottlerModule.forRoot([{
      name: 'address',
      ttl: seconds(60),
      limit: 5,
    }]),
    SharedModule,
  ],
  providers: [
    MintService,
    SupabaseService,
  ],
})
export class MintModule {}
