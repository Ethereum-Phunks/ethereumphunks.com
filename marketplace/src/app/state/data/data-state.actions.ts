import { EventType, GlobalState } from '@/models/global-state';
import { createAction, props } from '@ngrx/store';

import { Phunk } from '@/models/db';

// import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Collection } from '@/models/data.state';

export const resetDataState = createAction(
  '[Data State] Reset Data State'
);

export const setUsd = createAction(
  '[Data State] Set USD',
  props<{ usd: number }>()
);

export const fetchEvents = createAction(
  '[Data State] Fetch Events',
  props<{ eventType: EventType }>()
);

export const setEvents = createAction(
  '[Data State] Set Events',
  props<{ events: any[] }>()
);

// export const dbEventTriggered = createAction(
//   '[Data State] DB Event Triggered',
//   props<{ payload: RealtimePostgresChangesPayload<{ [key: string]: any; }> }>()
// );

// export const setUserOpenBids = createAction(
//   '[Data State] Set User Open Bids',
//   props<{ userOpenBids: Phunk[] }>()
// );

export const fetchLeaderboard = createAction(
  '[Data State] Fetch Leaderboard'
);

export const setLeaderboard = createAction(
  '[Data State] Set Leaderboard',
  props<{ leaderboard: any[] }>()
);

export const fetchCollections = createAction(
  '[Data State] Fetch Collections'
);

export const setCollections = createAction(
  '[Data State] Set Collections',
  props<{ collections: GlobalState['dataState']['collections'] }>()
);

export const setActiveCollection = createAction(
  '[Data State] Set Active Collection',
  props<{ activeCollection: Collection }>()
);
