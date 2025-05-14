import { Module } from "@nestjs/common";
import { HttpModule } from '@nestjs/axios';

import { AdminService } from "./admin.service";

import { DataService } from '@/services/data.service';
import { ProcessingService } from '@/services/processing.service';

import { StorageModule } from '@/modules/storage/storage.module';
import { SharedModule } from '@/modules/shared/shared.module';
import { EthscriptionsModule } from '@/modules/ethscriptions/ethscriptions.module';
import { CommentsModule } from '@/modules/comments/comments.module';
import { NotifsModule } from '@/modules/notifs/notifs.module';

@Module({
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
    ProcessingService
  ],
  exports: []
})
export class AdminModule {}
