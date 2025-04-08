import { Component, effect, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Store } from '@ngrx/store';
import { TimeagoModule } from 'ngx-timeago';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { switchMap } from 'rxjs';

import { WalletAddressDirective } from '@/directives/wallet-address.directive';

import { DataService } from '@/services/data.service';

import { WeiToEthPipe } from '@/pipes/wei-to-eth.pipe';

import { GlobalState } from '@/models/global-state';

import * as dataStateSelectors from '@/state/selectors/data-state.selectors';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LazyLoadImageModule,
    TimeagoModule,

    WalletAddressDirective,

    WeiToEthPipe,
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
  ) {}
}
