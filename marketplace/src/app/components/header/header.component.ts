import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Store } from '@ngrx/store';

import { MenuComponent } from '@/components/menu/menu.component';
import { SearchComponent } from '@/components/search/search.component';
import { CollectionsDropdownComponent } from '@/components/collections-dropdown/collections-dropdown.component';

import { Web3Service } from '@/services/web3.service';

import { Subject, map, tap, withLatestFrom } from 'rxjs';

import { WalletAddressDirective } from '@/directives/wallet-address.directive';
import { FormatCashPipe } from '@/pipes/format-cash.pipe';

import { GlobalState } from '@/models/global-state';

import * as appStateSelectors from '@/state/selectors/app-state.selectors';
import * as notificationSelectors from '@/state/selectors/notification.selectors';
import * as dataStateSelectors from '@/state/selectors/data-state.selectors';

import * as appStateActions from '@/state/actions/app-state.actions';

import { environment } from '@/../environments/environment';
import { LazyLoadImageModule } from 'ng-lazyload-image';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LazyLoadImageModule,

    SearchComponent,
    CollectionsDropdownComponent,

    WalletAddressDirective,
  ],
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})

export class HeaderComponent {

  connected$ = this.store.select(appStateSelectors.selectConnected);
  walletAddress$ = this.store.select(appStateSelectors.selectWalletAddress);
  hasWithdrawal$ = this.store.select(appStateSelectors.selectHasWithdrawal);
  userPoints$ = this.store.select(appStateSelectors.selectUserPoints);
  activeMultiplier$ = this.store.select(appStateSelectors.selectActiveMultiplier);
  activeCollection$ = this.store.select(dataStateSelectors.selectActiveCollection);
  menuActive$ = this.store.select(appStateSelectors.selectMenuActive);
  theme$ = this.store.select(appStateSelectors.selectTheme);
  notifications$ = this.store.select(notificationSelectors.selectNotifications).pipe(
    map((res) => res.filter((tx) => !tx.dismissed && tx.isNotification).length),
  );

  toggleTheme$ = new Subject<void>();
  toggleMenu$ = new Subject<void>();

  isStandaloneMarket = environment.standalone;

  constructor(
    private store: Store<GlobalState>,
    public web3Svc: Web3Service,
  ) {
    this.toggleTheme$.pipe(
      withLatestFrom(this.theme$),
      tap(([click, theme]) => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        this.store.dispatch(appStateActions.setTheme({ theme: newTheme }));
      }),
    ).subscribe();

    this.toggleMenu$.pipe(
      withLatestFrom(this.menuActive$),
      tap(([click, menuActive]) => {
        // console.log('menuActive', menuActive);
        this.store.dispatch(appStateActions.setMenuActive({ menuActive: !menuActive }));
      })
    ).subscribe();
  }
}
