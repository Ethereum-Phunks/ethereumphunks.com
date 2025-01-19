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

import { asyncScheduler, distinctUntilChanged, filter, forkJoin, from, map, mergeMap, of, switchMap, tap, throttleTime, withLatestFrom } from 'rxjs';

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
      map((collections) => collections.sort((a, b) => a.id - b.id)),
      // tap((collections) => console.log({ collections })),
      map((collections) => dataStateActions.setCollections({ collections })),
    )),
  ));

  setActiveCollection$ = createEffect(() => this.actions$.pipe(
    ofType(dataStateActions.setCollections),
    switchMap((action) => {
      return this.store.select(marketStateSelectors.selectMarketSlug).pipe(
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
