import { IndexerLogsState } from '@/models/global-state';
import { Action, ActionReducer, createReducer, on } from '@ngrx/store';
import * as actions from './indexer-logs.actions';

const initialState: IndexerLogsState = {
  logsActive: false,
  logs: []
};

export const indexerLogsReducer: ActionReducer<IndexerLogsState, Action> = createReducer(
  initialState,
  on(actions.setLogsActive, (state, { logsActive }) => {
    const setLogsActive = {
    ...state,
    logsActive
  };
  return setLogsActive
}),
on(actions.setLogs, (state, { logs }) => {
  const setLogs = {
    ...state,
    logs
  };
  console.log({setLogs});
  return setLogs
  })
);
