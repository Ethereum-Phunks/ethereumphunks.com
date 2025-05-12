import { Injectable } from '@angular/core';

import { Store } from '@ngrx/store';
import { scan, switchMap, take, map } from 'rxjs';

import { LogItem, SocketService } from '@/services/socket.service';
import { GlobalState } from '@/models/global-state';
import { setLogs } from './indexer-logs.actions';
import { createEffect } from '@ngrx/effects';

@Injectable()
export class IndexerLogsEffects {

  logs$ = createEffect(() => this.socketSvc.logs$.pipe(
    take(1),
    switchMap((initialLogs: LogItem[]) => {
      this.store.dispatch(setLogs({ logs: initialLogs }));
      return this.socketSvc.log$.pipe(
        scan((acc: LogItem[], log: LogItem) => {
          const newLogs = [...acc, log];
          return newLogs.length > 100 ? newLogs.slice(-100) : newLogs;
        }, initialLogs)
      )
    }),
    map((logs) => setLogs({ logs }))
  ));

  constructor(
    private store: Store<GlobalState>,
    private socketSvc: SocketService
  ) {}
}
