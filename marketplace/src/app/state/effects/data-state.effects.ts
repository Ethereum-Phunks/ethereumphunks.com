import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { Actions, createEffect, ofType } from '@ngrx/effects';

import { GlobalState } from '@/models/global-state';

import { DataService } from '@/services/data.service';

import * as appStateActions from '@/state/actions/app-state.actions';

import * as dataStateActions from '@/state/actions/data-state.actions';
import * as dataStateSelectors from '@/state/selectors/data-state.selectors';

import * as marketStateSelectors from '@/state/selectors/market-state.selectors';

import { filter, map, switchMap, take, tap } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class DataStateEffects {

  fetchCollections$ = createEffect(() => this.actions$.pipe(
    ofType(dataStateActions.fetchCollections),
    switchMap(() => this.dataSvc.fetchCollections().pipe(
      map((collections) => dataStateActions.setCollections({ collections })),
    )),
  ));

  whitelist: string[] = ['0xf1Aa941d56041d47a9a18e99609A047707Fe96c7'];
  fetchDisabledCollections$ = createEffect(() => this.actions$.pipe(
    ofType(appStateActions.setWalletAddress),
    filter((action) => {
      // console.log('fetchDisabledCollections$', { action });
      if (!action.walletAddress) return !environment.production;
      return this.whitelist
        .map((w) => w.toLowerCase())
        .includes(action.walletAddress.toLowerCase());
    }),
    switchMap(() => this.store.select(dataStateSelectors.selectCollections).pipe(
      filter((collections) => collections.length > 0),
      take(1),
      switchMap((collections) => this.dataSvc.fetchDisabledCollections().pipe(
        filter(disabledCollections => disabledCollections.length > 0),
        map((disabledCollections) => {
          // Filter out disabled collections that already exist in collections
          const newDisabledCollections = disabledCollections.filter(
            disabled => !collections.some(existing => existing.slug === disabled.slug)
          );
          return dataStateActions.setCollections({
            collections: [...collections, ...newDisabledCollections]
          });
        }),
      )),
    )),
  ));

  setActiveCollection$ = createEffect(() => this.actions$.pipe(
    ofType(dataStateActions.setCollections),
    switchMap((action) => {
      return this.store.select(marketStateSelectors.selectMarketSlug).pipe(
        filter(() => !!action.collections),
        // tap((slug) => console.log('setActiveCollection$', { slug })),
        map((slug) => action.collections.find((c) => c.slug === slug)),
        filter((activeCollection) => !!activeCollection),
        map((activeCollection) => dataStateActions.setActiveCollection({ activeCollection: { ...activeCollection! } }))
      );
    }),
  ));

  fetchLeaderboard$ = createEffect(() => this.actions$.pipe(
    ofType(dataStateActions.fetchLeaderboard),
    // tap(() => console.log('fetchLeaderboard')),
    switchMap(() => this.dataSvc.fetchLeaderboard()),
    map((leaderboard) => dataStateActions.setLeaderboard({ leaderboard })),
  ));

  constructor(
    private store: Store<GlobalState>,
    private actions$: Actions,
    private dataSvc: DataService
  ) {}
}
