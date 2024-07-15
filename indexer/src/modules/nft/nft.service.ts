import { Inject, Injectable, Logger } from '@nestjs/common';

import { ParseEventLogsReturnType, zeroAddress } from 'viem';

import { bridgeAbiL2, bridgeAddressL2, l2Client, marketAbiL2, marketAddressL2 } from '@/constants/ethereum';

import { SupabaseService } from '@/services/supabase.service';

import { Observable, catchError, of, tap } from 'rxjs';
import { Web3Service } from '../shared/services/web3.service';

@Injectable()
export class NftService {

  constructor(
    @Inject('WEB3_SERVICE_L2') private readonly web3SvcL2: Web3Service,
    private readonly sbSvc: SupabaseService,
  ) {
    new Observable<ParseEventLogsReturnType>((observer) => {
      l2Client.watchContractEvent({
        address: marketAddressL2 as `0x${string}`,
        abi: marketAbiL2,
        onLogs(logs: ParseEventLogsReturnType) { observer.next(logs) },
        onError(error) { observer.error(error) },
      });
    }).pipe(
      tap((logs) => this.processLogs(logs)),
      catchError((error) => {
        console.error('NftService', error);
        return of(null);
      }),
    ).subscribe();
  }

  async processLogs(logs: ParseEventLogsReturnType) {
    for (const log of logs) {
      const { eventName } = log;
      console.log({log})

      if (eventName === 'PhunkOffered') await this.processPhunkOfferedEvent(log);
      if (eventName === 'PhunkNoLongerForSale') await this.processPhunkNoLongerForSaleEvent(log);
      // if (eventName === 'BridgedOut') await this.processBridgedOutEvent(log);
    }
  }

  async processPhunkOfferedEvent(log: any) {

    const { transactionHash, args, eventName } = log;
    const { phunkIndex, toAddress, minValue } = args;

    // == Do some checks here ===========================
    // == Regardless, this token has been minted. =======
    // == All validity checks were done on L1 transaction

    const txn = await this.web3SvcL2.getTransaction(transactionHash);
    const hashId = await this.readTokenContract('tokenToHash', [phunkIndex]);

    await this.sbSvc.createListing(
      txn,
      new Date(),
      hashId,
      toAddress,
      minValue,
      true
    );

    this.sbSvc.addEvents([{
      txId: txn.hash + log.logIndex,
      type: eventName,
      hashId: hashId.toLowerCase(),
      from: txn.from?.toLowerCase(),
      to: zeroAddress,
      blockHash: txn.blockHash,
      txIndex: txn.transactionIndex,
      txHash: txn.hash,
      blockNumber: Number(txn.blockNumber),
      blockTimestamp: new Date(),
      value: BigInt(minValue).toString(),
      l2: true
    }])

    Logger.debug(`Offered phunk ${phunkIndex} to ${toAddress}`, hashId);
  }

  async processPhunkNoLongerForSaleEvent(log: any) {
    const { transactionHash, args, eventName } = log;
    const { phunkIndex } = args;

    const txn = await this.web3SvcL2.getTransaction(transactionHash);
    const hashId = await this.readTokenContract('tokenToHash', [phunkIndex]);

    const removedListing = await this.sbSvc.removeListing(hashId);
    if (!removedListing) return;

    this.sbSvc.addEvents([{
      txId: txn.hash + log.logIndex,
      type: eventName,
      hashId: hashId.toLowerCase(),
      from: txn.from?.toLowerCase(),
      to: zeroAddress,
      blockHash: txn.blockHash,
      txIndex: txn.transactionIndex,
      txHash: txn.hash,
      blockNumber: Number(txn.blockNumber),
      blockTimestamp: new Date(),
      value: BigInt(0).toString(),
      l2: true
    }]);
  }

  async readMarketContract(functionName: string, args: (string | undefined)[]) {
    const data = await l2Client.readContract({
      address: marketAddressL2 as `0x${string}`,
      abi: marketAbiL2,
      functionName: functionName as any,
      args: args as any,
    });
    return data;
  }

  async readTokenContract(functionName: any, args: (string | undefined)[]): Promise<any> {
    const call: any = await l2Client.readContract({
      address: bridgeAddressL2 as `0x${string}`,
      abi: bridgeAbiL2,
      functionName,
      args: args as any,
    });
    return call;
  }
}
