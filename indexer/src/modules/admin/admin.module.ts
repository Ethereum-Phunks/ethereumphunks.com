import { Module } from "@nestjs/common";
import { HttpModule } from '@nestjs/axios';

import { AdminService } from "./admin.service";

import { ProcessingService } from '@/modules/processing/processing.service';
import { Web3Service } from '@/modules/shared/services/web3.service';

import { NotifsModule } from '@/modules/notifs/notifs.module';
import { SharedModule } from '@/modules/shared/shared.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { CommentsModule } from '@/modules/comments/comments.module';
import { EthscriptionsModule } from '@/modules/ethscriptions/ethscriptions.module';

import { AdminController } from './admin.controller';
import { ProcessingModule } from '../processing/processing.module';

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
    NotifsModule,
    ProcessingModule
  ],
  providers: [
    AdminService,
    ProcessingService
  ],
  exports: []
})
export class AdminModule {}
