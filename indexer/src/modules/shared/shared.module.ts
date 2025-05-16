import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { EvmModule } from '@/modules/evm/evm.module';
import { AppConfigModule } from '@/config/config.module';

import { CustomLogger } from './services/logger.service';
import { TimeService } from './services/time.service';
import { UtilityService } from './services/utility.service';
import { Web3Service } from './services/web3.service';
import { DataService } from './services/data.service';

@Module({
  imports: [
    HttpModule,
    AppConfigModule,
    EvmModule
  ],
  providers: [
    Web3Service,
    {
      provide: 'WEB3_SERVICE_L1',
      useFactory: (web3Service: Web3Service) => {
        const service = web3Service.forLayer('L1');
        return service;
      },
      inject: [Web3Service],
    },
    {
      provide: 'WEB3_SERVICE_L2',
      useFactory: (web3Service: Web3Service) => {
        const service = web3Service.forLayer('L2');
        return service;
      },
      inject: [Web3Service],
    },
    CustomLogger,
    TimeService,
    UtilityService,
    DataService,
  ],
  exports: [
    Web3Service,
    'WEB3_SERVICE_L1',
    'WEB3_SERVICE_L2',
    CustomLogger,
    TimeService,
    UtilityService,
    DataService,
  ]
})
export class SharedModule {}
