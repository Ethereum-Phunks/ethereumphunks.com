import { Module, forwardRef } from '@nestjs/common';

import { CommentsService } from './comments.service';
import { SupabaseService } from '@/services/supabase.service';

import { SharedModule } from '@/modules/shared/shared.module';

@Module({
  imports: [
    SharedModule
  ],
  providers: [
    CommentsService,
    SupabaseService,
  ],
  exports: [
    CommentsService
  ],
})
export class CommentsModule {}
