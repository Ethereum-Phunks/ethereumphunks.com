import { Module } from '@nestjs/common';

// import { Web3Service } from '@/modules/shared/services/web3.service';
// import { StorageService } from '@/modules/storage/storage.service';

import { KeyGenService } from './services/key-gen.service';
import { AgentService } from './agent.service';

@Module({
  imports: [],
  providers: [
    // {
    //   provide: 'WEB3_SERVICE_L1',
    //   useFactory: () => new Web3Service('l1'),
    // },
    KeyGenService,
    AgentService,
    // StorageService
  ],
  exports: [AgentService],
})
export class AgentModule {}
