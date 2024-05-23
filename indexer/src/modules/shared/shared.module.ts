import { Module } from '@nestjs/common';

import { CustomLogger } from './services/logger.service';
import { TimeService } from './services/time.service';
import { UtilityService } from './services/utility.service';
import { Web3Service } from './services/web3.service';

@Module({
  providers: [
    {
      provide: 'WEB3_SERVICE_L1',
      useFactory: () => new Web3Service('l1'),
    },
    {
      provide: 'WEB3_SERVICE_L2',
      useFactory: () => new Web3Service('l2'),
    },
    CustomLogger,
    TimeService,
    UtilityService,
  ],
  exports: [
    {
      provide: 'WEB3_SERVICE_L1',
      useFactory: () => new Web3Service('l1'),
    },
    {
      provide: 'WEB3_SERVICE_L2',
      useFactory: () => new Web3Service('l2'),
    },
    CustomLogger,
    TimeService,
    UtilityService,
  ]
})
export class SharedModule {}
