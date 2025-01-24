import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { Web3Service } from '@/modules/shared/services/web3.service';

import { TxpoolService } from './txpool.service';
import { TxPoolGateway } from './txpool.gateway';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    TxpoolService,
    TxPoolGateway,
    {
      provide: 'WEB3_SERVICE_L1',
      useFactory: () => new Web3Service('l1'),
    },
  ],
  exports: [
    TxpoolService,
  ],
})
export class TxpoolModule {}
