import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConditionalModule } from '@nestjs/config';

import { TxPoolService } from './tx-pool.service';
import { TxPoolGateway } from './tx-pool.gateway';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    TxPoolService,
    TxPoolGateway
  ],
  exports: [
    TxPoolService,
  ],
})
export class TxPoolModule {}

ConditionalModule.registerWhen(TxPoolModule, 'TX_POOL');
