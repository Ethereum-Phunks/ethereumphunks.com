import { Module } from '@nestjs/common';

import { EvmService } from './evm.service';
import { AppConfigModule } from '@/config/config.module';

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
