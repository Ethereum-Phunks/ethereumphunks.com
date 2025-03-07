import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { Actions, createEffect, ofType } from '@ngrx/effects';

import { GlobalState } from '@/models/global-state';
import { Event, Phunk } from '@/models/db';

import { DataService } from '@/services/data.service';

import * as appStateActions from '@/state/actions/app-state.actions';
import * as appStateSelectors from '@/state/selectors/app-state.selectors';

import * as dataStateActions from '@/state/actions/data-state.actions';
import * as dataStateSelectors from '@/state/selectors/data-state.selectors';

import * as marketStateActions from '@/state/actions/market-state.actions';
import * as marketStateSelectors from '@/state/selectors/market-state.selectors';

import { asyncScheduler, distinctUntilChanged, filter, forkJoin, from, map, mergeMap, of, switchMap, take, tap, throttleTime, withLatestFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable()
export class DataStateEffects {

  // When the database is updated
  dbEventTriggered$ = createEffect(() => this.actions$.pipe(
    ofType(dataStateActions.dbEventTriggered),
    withLatestFrom(this.store.select(dataStateSelectors.selectSinglePhunk)),
    map(([action, singlePhunk]) => {
      // Check if the event is for the active phunk
      const newEvent = action.payload.new as Event;
      this.checkEventIsActiveSinglePhunk(newEvent, singlePhunk);
      return newEvent;
    }),
    // Start with the throttle
    throttleTime(3000, asyncScheduler, {
      leading: true, // emit the first value immediately
      trailing: true // emit the last value in the window
    }),
    map((event) => marketStateActions.triggerDataRefresh()),
  ));

  fetchCollections$ = createEffect(() => this.actions$.pipe(
    ofType(dataStateActions.fetchCollections),
    switchMap(() => this.dataSvc.fetchCollections().pipe(
      map((collections) => dataStateActions.setCollections({ collections })),
      // tap((collections) => console.log('fetchCollections$', { collections })),
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
        filter((slug) => !!action.collections),
        map((slug) => {
          const coll = action.collections.find((c) => c.slug === slug);
          const activeCollection = { ...coll! };
          // console.log({ slug, coll, activeCollection });
          return dataStateActions.setActiveCollection({ activeCollection });
        })
      );
    }),
  ));

  fetchEvents$ = createEffect(() => this.actions$.pipe(
    ofType(
      appStateActions.setEventTypeFilter,
      marketStateActions.triggerDataRefresh
    ),
    withLatestFrom(this.store.select(appStateSelectors.selectEventTypeFilter)),
    switchMap(([_, eventTypeFilter]) => {
      return this.store.select(marketStateSelectors.selectMarketSlug).pipe(
        switchMap((slug) => this.dataSvc.fetchEvents(24, eventTypeFilter, slug)),
      );
    }),
    map((events) => dataStateActions.setEvents({ events })),
  ));

  fetchSingle$ = createEffect(() => this.actions$.pipe(
    ofType(dataStateActions.fetchSinglePhunk),
    // Reset the single phunk
    withLatestFrom(this.store.select(dataStateSelectors.selectSinglePhunk)),
    tap(([action, phunk]) => {
      const cleanPhunk = phunk ? { ...phunk, loading: true } : null;
      this.store.dispatch(dataStateActions.setSinglePhunk({ phunk: cleanPhunk }))
    }),
    switchMap(([action]) => this.dataSvc.fetchSinglePhunk(action.phunkId).pipe(
      switchMap((phunk) => {
        // console.log({phunk})
        if (!phunk.isSupported) {
          return this.dataSvc.fetchUnsupportedItem(action.phunkId);
        }
        return of(phunk);
      })
    )),
    // tap((phunk) => console.log('fetchSingle$', phunk)),
    mergeMap((phunk) => [
      dataStateActions.setSinglePhunk({ phunk }),
      marketStateActions.setMarketSlug({ marketSlug: phunk.slug }),
    ]),
  ));

  refreshSingle$ = createEffect(() => this.actions$.pipe(
    ofType(dataStateActions.refreshSinglePhunk),
    withLatestFrom(this.store.select(dataStateSelectors.selectSinglePhunk)),
    filter(([action, phunk]) => !!phunk),
    map(([action, phunk]) => dataStateActions.fetchSinglePhunk({ phunkId: `${phunk!.hashId}` })),
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

  checkEventIsActiveSinglePhunk(event: Event, singlePhunk: Phunk | null) {
    if (!singlePhunk) return;
    if (event.hashId === singlePhunk.hashId) {
      this.store.dispatch(dataStateActions.refreshSinglePhunk());
    }
  }
}
