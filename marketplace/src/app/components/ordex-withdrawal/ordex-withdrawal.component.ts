import { Component, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Web3Service } from '@/services/web3.service';

import { Store } from '@ngrx/store';
import { GlobalState } from '@/models/global-state';

import { catchError, expand, EMPTY, firstValueFrom, map, Observable, of, reduce, switchMap, tap, filter } from 'rxjs';

import { OrdexMarketABI } from '@/abi/OrdexMarket';

import { selectWalletAddress } from '@/state/selectors/app-state.selectors';
import { WalletAddressDirective } from '@/directives/wallet-address.directive';

interface EthscriptionResponse {
  continuation?: string;
  total: number;
  items: any[];
}

@Component({
  standalone: true,
  imports: [
    JsonPipe,
    WalletAddressDirective
  ],
  selector: 'app-ordex-withdrawal',
  templateUrl: './ordex-withdrawal.component.html',
  styleUrl: './ordex-withdrawal.component.scss'
})
export class OrdexWithdrawalComponent {

  stillEscrowedIds = signal<string[] | null>(null);
  dismiss = signal(localStorage.getItem('ordex-withdrawal-dismiss') === 'true');

  transactionPending = signal(false);
  transactionError = signal<any | null>(null);
  transactionComplete = signal(false);
  transactionHash = signal<string | null>(null);

  // this.getUserEscrowedEthscriptions(this.walletAddress()).subscribe(res => {
  //   if (res) {
  //     this.stillEscrowedIds = res;
  //   }
  // });

  constructor(
    private store: Store<GlobalState>,
    private http: HttpClient,
    private web3Svc: Web3Service
  ) {
    this.store.select(selectWalletAddress).pipe(
      filter(() => !this.dismiss()),
      tap((address) => {
        if (!address) this.stillEscrowedIds.set(null);
      }),
      switchMap((address) => this.getUserEscrowedEthscriptions(address)),
      tap((res) => this.stillEscrowedIds.set(res)),
    ).subscribe();
  }

  getUserEscrowedEthscriptions(address: string | undefined): Observable<any[] | null> {
    if (!address) return of(null);

    const url = `https://api.ordex.io/v0.1/items/byOwner?owner=ETHEREUM:${address}`;

    return this.http.get<EthscriptionResponse>(url).pipe(
      expand((res) => {
        if (res?.continuation && res.total === 50) {
          return this.http.get<EthscriptionResponse>(
            `${url}&continuation=${res.continuation}`
          );
        }
        return EMPTY;
      }),
      map(res => res.items || []),
      reduce((acc, items) => [...acc, ...items], [] as any[]),
      map((res) => this.filterEscrowedEthscriptions(res)),
      switchMap((res) => this.getStillEscrowedIds(res.map(e => e.hashId))),
      catchError(err => {
        console.error(err)
        return of(null)
      })
    );
  }

  filterEscrowedEthscriptions(ethscriptions: any[]) {
    const escrowed = ethscriptions
      .filter(ethscription => ethscription?.extension?.escrowState !== "EMPTY")
      .map(ethscription => ({
        hashId: ethscription.id.split(":")[1],
        content: ethscription?.meta?.rawContent
      }));
    return escrowed;
  }

  getStillEscrowedIds(hashes: string[]): Observable<string[] | null> {
    const chunkSize = 100;
    const chunks = Array.from({ length: Math.ceil(hashes.length / chunkSize) }, (_, i) =>
      hashes.slice(i * chunkSize, (i + 1) * chunkSize)
    );

    // Create initial state
    const initialState = { page: 1, chunks, currentChunkIndex: 0, results: [] as string[] };

    return of(initialState).pipe(
      expand(state => {
        if (state.currentChunkIndex >= chunks.length) return EMPTY;

        return this.http.get(`https://api.ethscriptions.com/api/ethscriptions/filtered`, {
          params: {
            transaction_hash: JSON.stringify(chunks[state.currentChunkIndex]),
            current_owner: "0xc33f8610941be56fb0d84e25894c0d928cc97dde",
            page: state.page
          }
        }).pipe(
          map((res: any) => ({
            ...state,
            currentChunkIndex: state.currentChunkIndex + 1,
            results: [...state.results, ...res.ethscriptions.map((e: any) => e.transaction_hash)]
          })),
          catchError(err => {
            console.error(err);
            return of({ ...state, currentChunkIndex: chunks.length }); // Skip to end on error
          })
        );
      }),
      map(state => state.results),
      reduce((acc, curr) => acc.concat(curr), [] as string[]),
      catchError(err => {
        console.error(err);
        return of(null);
      })
    );
  }

  async withdraw(stillEscrowedIds: string[]) {
    try {
      this.transactionPending.set(true);
      this.transactionError.set(null);
      this.transactionComplete.set(false);

      stillEscrowedIds = stillEscrowedIds.map(e => BigInt(e.toLowerCase()).toString());
      const message = this.getMessage(stillEscrowedIds);
      const signedMessage = await this.web3Svc.signMessage(message);

      const req = this.http.post('https://api-next.ordex.io/signer/s/wc', {
        client: this.web3Svc.getCurrentAddress(),
        itemIds: stillEscrowedIds,
        clientSignature: signedMessage,
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const res = await firstValueFrom(req);

      const { confirmation, sig } = res as any;
      const { from, to, ids } = confirmation
      const { expiryTimestamp, v, r, s } = sig

      const confirmation_obj = { from, to, ids }
      const signature = { expiryTimestamp: parseInt(expiryTimestamp), v, r, s }

      const txn = await this.web3Svc.writeContract({
        abi: OrdexMarketABI,
        address: "0xC33F8610941bE56fB0d84E25894C0d928CC97ddE",
        functionName: "bulkWithdrawItems",
        args: [confirmation_obj, signature],
      });

      this.transactionHash.set(txn);

      await this.web3Svc.waitForTransaction(txn);
      this.transactionComplete.set(true);

    } catch (err: any) {
      console.error(err);
      this.transactionError.set(err);
    } finally {
      this.transactionPending.set(false);
    }
  }

  getMessage(e: string[]) {
    const r = e.join(", ");
    const n = 'withdraw the following item';
    const i = new Date();
    const o = (Math.floor(i.getTime() / 6e5) + 2) * 6e5;
    const a = new Date(o).toISOString();
    const s = `\n\nSigning this message does not cost gas.\u0020\n\nThis signature expires at: ${a}`;
    return `I would like to ${n}${e.length > 1 ? "s" : ""}: ${r} ${s}`
  }

  close() {
    this.dismiss.set(true);
    localStorage.setItem('ordex-withdrawal-dismiss', 'true');
  }
}
