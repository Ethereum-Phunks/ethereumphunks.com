import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

import { catchError, firstValueFrom, map, of, tap } from 'rxjs';

import { AppConfigService } from '@/config/config.service';

@Injectable()
export class DataService {

  constructor(
    private readonly http: HttpService,
    private readonly configSvc: AppConfigService
  ) {}

  checkConsensus(owner: string, hashId: string): any {
    const prefix = this.configSvc.chain.chainIdL1 === 1 ? '' : 'sepolia-';
    const url = `https://${prefix}api-v2.ethscriptions.com/api/ethscriptions/${hashId}`;

    return firstValueFrom(
      this.http.get(url).pipe(
        map(response => {
          if (response.data?.current_owner?.toLowerCase() === owner.toLowerCase()) return true;
          return false;
        }),
        catchError(error => {
          return of(false);
        }),
      )
    );
  }

  async getEthscriptionByHashId(hashId: string): Promise<any> {
    const prefix = this.configSvc.chain.chainIdL1 === 1 ? '' : '-sepolia';
    const url = `https://ethscriptions-api${prefix}.flooredape.io/ethscriptions/${hashId}`;

    return firstValueFrom(
      this.http.get(url).pipe(
        map(response => response.data?.result),
        catchError(error => {
          // console.log('getEthscriptionBySha', error);
          return of(null);
        }),
      )
    );
  }

  async getEthscriptionBySha(sha: string): Promise<any> {
    const prefix = this.configSvc.chain.chainIdL1 === 1 ? '' : 'sepolia-';
    const url = `https://${prefix}api-v2.ethscriptions.com/api/ethscriptions?content_sha=0x${sha}`;

    return firstValueFrom(
      this.http.get(url).pipe(
        // tap(response => console.log('getEthscriptionBySha', response.data)),
        map(response => !!response.data?.result[0]),
        catchError(error => {
          // console.log('getEthscriptionBySha', error);
          return of(null);
        }),
      )
    );
  }
}
