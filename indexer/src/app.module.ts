import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { SharedModule } from '@/modules/shared/shared.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { NotifsModule } from '@/modules/notifs/notifs.module';
import { BridgeL1Module } from '@/modules/bridge-l1/bridge-l1.module';
import { NftModule } from '@/modules/nft/nft.module';
import { BridgeL2Module } from '@/modules/bridge-l2/bridge-l2.module';
import { EthscriptionsModule } from '@/modules/ethscriptions/ethscriptions.module';
import { TxPoolModule } from '@/modules/tx-pool/tx-pool.module';
import { MintModule } from '@/modules/mint/mint.module';

import { AppService } from '@/app.service';
import { AppController } from '@/app.controller';
import { AppGateway } from '@/app.gateway';

import { DataService } from '@/services/data.service';
import { SupabaseService } from '@/services/supabase.service';
import { ProcessingService } from '@/services/processing.service';

import { ApiKeyMiddleware } from '@/middleware/api-key.middleware';
import { CommentsModule } from '@/modules/comments/comments.module';

@Module({
  imports: [
    HttpModule,

    NftModule,
    BridgeL2Module,

    EthscriptionsModule,
    QueueModule,
    BridgeL1Module,

    NotifsModule,
    SharedModule,
    ...(Number(process.env.TX_POOL) ? [TxPoolModule] : []),
    ...(Number(process.env.MINT) ? [MintModule] : []),

    CommentsModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppGateway,
    SupabaseService,
    ProcessingService,
    DataService,
  ],
})

export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiKeyMiddleware)
      .forRoutes({
        path: '/admin/*',
        method: RequestMethod.ALL
      },
      {
        path: '/ethscriptions/*',
        method: RequestMethod.POST
      },
      {
        path: '/notifications/*',
        method: RequestMethod.POST
      },
      {
        path: '/bridge-l1/*',
        method: RequestMethod.POST
      });
  }
}
