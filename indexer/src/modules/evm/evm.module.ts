import { AppConfigModule } from '@/config/config.module';
import { Module } from '@nestjs/common';

import { EvmService } from './evm.service';

@Module({
  imports: [
    AppConfigModule,
  ],
  providers: [
    EvmService,
  ],
  exports: [
    EvmService,
  ],
})
export class EvmModule {}
