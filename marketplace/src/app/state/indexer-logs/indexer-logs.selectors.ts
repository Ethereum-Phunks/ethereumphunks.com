import { createSelector } from '@ngrx/store';

import { GlobalState, IndexerLogsState } from '@/models/global-state';

export const selectIndexerLogsState = (state: GlobalState) => state.indexerLogsState;

export const selectLogsActive = createSelector(
  selectIndexerLogsState,
  (indexerLogsState: IndexerLogsState) => indexerLogsState.logsActive
);

export const selectLogs = createSelector(
  selectIndexerLogsState,
  (indexerLogsState: IndexerLogsState) => indexerLogsState.logs
);
