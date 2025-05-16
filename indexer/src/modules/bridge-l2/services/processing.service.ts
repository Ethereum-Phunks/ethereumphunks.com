import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ParseEventLogsReturnType, erc721Abi } from 'viem';

import { StorageService } from '@/modules/storage/storage.service';

import { bridgeL2 } from '@/abi';

import { Observable, catchError, of, tap } from 'rxjs';
import { AppConfigService } from '@/config/config.service';
import { EvmService } from '@/modules/evm/evm.service';

@Injectable()
export class ProcessingService implements OnModuleInit {

  constructor(
    private readonly storageSvc: StorageService,
    private readonly configSvc: AppConfigService,
    private readonly evmSvc: EvmService
  ) {}

  async onModuleInit() {
    new Observable<ParseEventLogsReturnType>((observer) => {
      this.evmSvc.publicClientL2.watchContractEvent({
        address: this.configSvc.chain.contracts.bridge.l2 as `0x${string}`,
        abi: bridgeL2,
        onLogs(logs: ParseEventLogsReturnType) { observer.next(logs) },
        onError(error) { observer.error(error) },
      });
    }).pipe(
      tap((logs) => this.processLogs(logs)),
      catchError((error) => {
        console.log('ProcessingService', error);
        return of(null);
      }),
    ).subscribe();
  }

  async processLogs(logs: ParseEventLogsReturnType) {
    for (const log of logs) {
      const { eventName } = log;

      if (eventName === 'BridgedIn') await this.processBridgedInEvent(log);
      if (eventName === 'Transfer') await this.processTransferEvent(log);
      if (eventName === 'BridgedOut') await this.processBridgedOutEvent(log);
    }
  }

  async processBridgedInEvent(log: any) {
    const { sender, tokenId, hashId } = log.args;

    // == Do some checks here ===========================
    // == Regardless, this token has been minted. =======
    // == All validity checks were done on L1 transaction

    await this.storageSvc.addNftL2(Number(tokenId), sender, hashId);
    Logger.debug(`Bridged in by ${sender}`, hashId);
  }

  async processTransferEvent(log: any) {
    const { from, to, tokenId } = log.args;

    // == Do some checks here ===========================
    // == Regardless, this token has been transferred. ===
    // == All validity checks were done on L1 transaction

    await this.storageSvc.updateNftL2(Number(tokenId), to);
    Logger.debug(`Transferred from ${from} to ${to}`, tokenId.toString());
  }

  async processBridgedOutEvent(log: any) {
    const { receiver, tokenId, hashId } = log.args;

    // == Do some checks here ===========================
    // == Regardless, this token has been burned. ========
    // == All validity checks were done on L1 transaction

    await this.storageSvc.removeNftL2(Number(tokenId), hashId);
    Logger.debug(`Bridged out to ${receiver}`, hashId);
  }

  async readContract(address: string, functionName: string) {
    const data = await this.evmSvc.publicClientL2.readContract({
      address: address as `0x${string}`,
      abi: erc721Abi,
      functionName: functionName as any,
    });
    return data;
  }
}
