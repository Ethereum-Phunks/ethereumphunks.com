import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { ParseEventLogsReturnType, zeroAddress } from 'viem';

import { bridgeL2, marketL2 } from '@/abi';

import { StorageService } from '@/modules/storage/storage.service';
import { Web3Service } from '@/modules/shared/services/web3.service';
import { EvmService } from '@/modules/evm/evm.service';
import { AppConfigService } from '@/config/config.service';

import { Observable, catchError, of, tap } from 'rxjs';

@Injectable()
export class NftService implements OnModuleInit {

  constructor(
    @Inject('WEB3_SERVICE_L2') private readonly web3SvcL2: Web3Service,
    private readonly storageSvc: StorageService,
    private readonly evmSvc: EvmService,
    private readonly configSvc: AppConfigService,
  ) {}

  async onModuleInit() {
    new Observable<ParseEventLogsReturnType>((observer) => {
      this.evmSvc.publicClientL2.watchContractEvent({
        address: this.configSvc.chain.contracts.market.l2 as `0x${string}`,
        abi: marketL2,
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

    await this.storageSvc.createListing(
      txn,
      new Date(),
      hashId,
      toAddress,
      minValue,
      true
    );

    this.storageSvc.addEvents([{
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

    const removedListing = await this.storageSvc.removeListing(hashId);
    if (!removedListing) return;

    this.storageSvc.addEvents([{
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
    const data = await this.evmSvc.publicClientL2.readContract({
      address: this.configSvc.chain.contracts.market.l2 as `0x${string}`,
      abi: marketL2,
      functionName: functionName as any,
      args: args as any,
    });
    return data;
  }

  async readTokenContract(functionName: any, args: (string | undefined)[]): Promise<any> {
    const call: any = await this.evmSvc.publicClientL2.readContract({
      address: this.configSvc.chain.contracts.bridge.l2 as `0x${string}`,
      abi: bridgeL2,
      functionName,
      args: args as any,
    });
    return call;
  }
}
