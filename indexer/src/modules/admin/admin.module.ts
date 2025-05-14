import { Module } from "@nestjs/common";
import { HttpModule } from '@nestjs/axios';

import { AdminService } from "./admin.service";

import { DataService } from '@/services/data.service';
import { ProcessingService } from '@/services/processing.service';
import { Web3Service } from '@/modules/shared/services/web3.service';

import { NotifsModule } from '@/modules/notifs/notifs.module';
import { SharedModule } from '@/modules/shared/shared.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { CommentsModule } from '@/modules/comments/comments.module';
import { EthscriptionsModule } from '@/modules/ethscriptions/ethscriptions.module';

import { AdminController } from './admin.controller';

@Module({
  controllers: [
    AdminController
  ],
  imports: [
    HttpModule,
    StorageModule,
    SharedModule,
    EthscriptionsModule,
    CommentsModule,
    NotifsModule
  ],
  providers: [
    AdminService,
    DataService,
    ProcessingService,
    {
      provide: 'WEB3_SERVICE_L1',
      useFactory: () => new Web3Service('l1'),
    },
  ],
  exports: []
})
export class AdminModule {}
