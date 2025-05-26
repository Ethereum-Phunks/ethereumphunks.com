import { Module } from '@nestjs/common';

import { AppConfigModule } from '@/config/config.module';

import { KeyGenService } from './services/key-gen.service';
import { AgentService } from './agent.service';
import { LangchainService } from './services/langchain.service';

@Module({
  imports: [
    AppConfigModule,
  ],
  providers: [
    KeyGenService,
    AgentService,
    LangchainService,
  ],
  exports: [],
})
export class AgentModule {}
