import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

import { catchError, firstValueFrom, map, of } from 'rxjs';

import dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class DataService {

  constructor(
    private readonly http: HttpService
  ) {}

  checkConsensus(owner: string, hashId: string): any {
    const prefix = process.env.CHAIN_ID === '1' ? '' : 'sepolia-';
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
}
