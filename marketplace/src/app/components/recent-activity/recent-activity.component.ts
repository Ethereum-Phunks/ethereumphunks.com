import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Store } from '@ngrx/store';
import { NgSelectModule } from '@ng-select/ng-select';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { TimeagoModule } from 'ngx-timeago';

import { WalletAddressDirective } from '@/directives/wallet-address.directive';

import { DataService } from '@/services/data.service';

import { WeiToEthPipe } from '@/pipes/wei-to-eth.pipe';

import { EventType, GlobalState, TxFilterItem } from '@/models/global-state';
import { Event } from '@/models/db';

import * as dataStateSelectors from '@/state/selectors/data-state.selectors';
import * as appStateActions from '@/state/actions/app-state.actions';
import { Collection } from '@/models/data.state';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LazyLoadImageModule,
    TimeagoModule,
    NgSelectModule,
    ReactiveFormsModule,
    FormsModule,

    WalletAddressDirective,
    WeiToEthPipe,
  ],
  selector: 'app-recent-activity',
  templateUrl: './recent-activity.component.html',
  styleUrls: ['./recent-activity.component.scss']
})
export class RecentActivityComponent {

  events = input.required<Event[] | null>();
  collection = input.required<Collection | null>();

  txFilters: TxFilterItem[] = [
    { label: 'All', value: 'All' },
    { label: 'Created', value: 'created' },
    { label: 'Transferred', value: 'transfer' },
    { label: 'Sold', value: 'PhunkBought' },
    { label: 'Bid Entered', value: 'PhunkBidEntered' },
    { label: 'Bid Withdrawn', value: 'PhunkBidWithdrawn' },
    { label: 'Offered', value: 'PhunkOffered' },
    // { label: 'Bridged', value: 'bridgeOut' },
    // { label: 'Bridged', value: 'bridgeIn' },

    // { label: 'Escrowed', value: 'escrow' },
    // { label: 'Offer Withdrawn', value: 'PhunkOfferWithdrawn' },
  ];

  _activeTxFilter: EventType = this.txFilters[0].value;

  labels: any = {
    PhunkBidEntered: 'New bid of',
    PhunkBidWithdrawn: 'Bid withdrawn',
    PhunkOffered: 'Offered for',
    PhunkBought: 'Bought for',
    transfer: 'Transferred to',
    created: 'Created by',
    bridgeOut: 'Bridged (Locked) by',
    bridgeIn: 'Bridged (Unlocked) by',
    // escrow: 'Escrowed by',
    // PhunkNoLongerForSale: 'Offer withdrawn',
  };

  usd$ = this.store.select(dataStateSelectors.selectUsd);

  constructor(
    private store: Store<GlobalState>,
    public dataSvc: DataService
  ) {
    this.store.dispatch(appStateActions.setEventTypeFilter({ eventTypeFilter: this._activeTxFilter }));
  }

  setActiveTxFilter(filter: TxFilterItem): void {
    this.store.dispatch(appStateActions.setEventTypeFilter({ eventTypeFilter: filter.value }));
  }
}
