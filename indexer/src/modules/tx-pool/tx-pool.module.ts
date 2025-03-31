import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { Web3Service } from '@/modules/shared/services/web3.service';

import { TxPoolService } from './tx-pool.service';
import { TxPoolGateway } from './tx-pool.gateway';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    TxPoolService,
    TxPoolGateway,
    {
      provide: 'WEB3_SERVICE_L1',
      useFactory: () => new Web3Service('l1'),
    },
  ],
  exports: [
    TxPoolService,
  ],
})
export class TxPoolModule {}
