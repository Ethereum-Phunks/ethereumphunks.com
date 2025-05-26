import { Module } from '@nestjs/common';

import { KeyGenService } from './services/key-gen.service';
import { AgentService } from './agent.service';
import { LangchainService } from './services/langchain.service';

@Module({
  imports: [],
  providers: [
    KeyGenService,
    AgentService,
    LangchainService,
  ],
  exports: [],
})
export class AgentModule {}
