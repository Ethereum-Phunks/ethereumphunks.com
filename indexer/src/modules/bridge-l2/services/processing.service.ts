import { Injectable, Logger } from '@nestjs/common';

import { ParseEventLogsReturnType, erc721Abi } from 'viem';

import { bridgeAddressL2, l2Client } from '@/constants/ethereum';

import { SupabaseService } from '@/services/supabase.service';

import etherPhunksBridgeL2 from '@/abi/EtherPhunksBridgeL2.json';

import { Observable, catchError, of, tap } from 'rxjs';

@Injectable()
export class ProcessingService {

  constructor(
    private readonly sbSvc: SupabaseService
  ) {
    new Observable<ParseEventLogsReturnType>((observer) => {
      l2Client.watchContractEvent({
        address: bridgeAddressL2 as `0x${string}`,
        abi: etherPhunksBridgeL2,
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

    await this.sbSvc.addNftL2(Number(tokenId), sender, hashId);
    Logger.debug(`Bridged in by ${sender}`, hashId);
  }

  async processTransferEvent(log: any) {
    const { from, to, tokenId } = log.args;

    // == Do some checks here ===========================
    // == Regardless, this token has been transferred. ===
    // == All validity checks were done on L1 transaction

    await this.sbSvc.updateNftL2(Number(tokenId), to);
    Logger.debug(`Transferred from ${from} to ${to}`, tokenId.toString());
  }

  async processBridgedOutEvent(log: any) {
    const { receiver, tokenId, hashId } = log.args;

    // == Do some checks here ===========================
    // == Regardless, this token has been burned. ========
    // == All validity checks were done on L1 transaction

    await this.sbSvc.removeNftL2(Number(tokenId), hashId);
    Logger.debug(`Bridged out to ${receiver}`, hashId);
  }

  async readContract(address: string, functionName: string) {
    const data = await l2Client.readContract({
      address: address as `0x${string}`,
      abi: erc721Abi,
      functionName: functionName as any,
    });
    return data;
  }
}
