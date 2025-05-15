import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { CustomLogger } from './services/logger.service';
import { TimeService } from './services/time.service';
import { UtilityService } from './services/utility.service';
import { Web3Service } from './services/web3.service';
import { DataService } from './services/data.service';

import { AppConfigModule } from '@/config/config.module';

@Module({
  imports: [
    HttpModule,
    AppConfigModule,
  ],
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
    DataService,
  ],
  exports: [
    'WEB3_SERVICE_L1',
    'WEB3_SERVICE_L2',
    CustomLogger,
    TimeService,
    UtilityService,
    DataService,
  ]
})
export class SharedModule {}
