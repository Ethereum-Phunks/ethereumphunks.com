import { Module } from '@nestjs/common';

import { CardController } from './card.controller';

import { GenerateService } from './services/generate.service';
import { Web3Service } from '@/modules/shared/services/web3.service';

@Module({
  controllers: [
    CardController
  ],
  providers: [
    {
      provide: 'WEB3_SERVICE_L1',
      useFactory: () => new Web3Service('l1'),
    },
    GenerateService
  ],
  exports: [],
})
export class CardModule {}
