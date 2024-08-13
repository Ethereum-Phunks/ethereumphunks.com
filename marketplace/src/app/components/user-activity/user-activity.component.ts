import { Component, effect, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Store } from '@ngrx/store';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { TimeagoModule } from 'ngx-timeago';

import { WalletAddressDirective } from '@/directives/wallet-address.directive';

import { DataService } from '@/services/data.service';

import { TokenIdParsePipe } from '@/pipes/token-id-parse.pipe';
import { WeiToEthPipe } from '@/pipes/wei-to-eth.pipe';
import { CalcPipe } from '@/pipes/calculate.pipe';
import { FormatCashPipe } from '@/pipes/format-cash.pipe';

import { GlobalState } from '@/models/global-state';

import * as dataStateSelectors from '@/state/selectors/data-state.selectors';
import { switchMap } from 'rxjs';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LazyLoadImageModule,
    TimeagoModule,

    WalletAddressDirective,

    TokenIdParsePipe,
    WeiToEthPipe,
    CalcPipe,
    FormatCashPipe
  ],
  selector: 'app-user-activity',
  templateUrl: './user-activity.component.html',
  styleUrls: ['./user-activity.component.scss']
})
export class UserActivityComponent {

  address = input.required<string>();
  events$ = toObservable(this.address).pipe(
    switchMap((address: string) => this.dataSvc.fetchUserEvents(address, 10))
  )

  labels: any = {
    PhunkBidEntered: 'New bid of',
    PhunkBidWithdrawn: 'Bid withdrawn',
    PhunkOffered: 'Offered for',
    PhunkBought: 'Bought for',
    transfer: 'Transferred to',
    created: 'Created by',
    bridgeOut: 'Bridged by',
    bridgeIn: 'Bridged (Unlocked) by',
    // escrow: 'Escrowed by',
    // PhunkNoLongerForSale: 'Offer withdrawn',
  };

  usd$ = this.store.select(dataStateSelectors.selectUsd);

  constructor(
    private store: Store<GlobalState>,
    public dataSvc: DataService
  ) {

    effect(() => {
      // console.log('UserActivityComponent: address', this.address());
    });
  }
}
