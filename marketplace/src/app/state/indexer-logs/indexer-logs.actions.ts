import { LogItem } from '@/services/socket.service';
import { createAction } from '@ngrx/store';
import { props } from '@ngrx/store';

export const setLogsActive = createAction(
  '[Indexer Logs State] Set Logs Active',
  props<{ logsActive: boolean }>()
);

export const setLogs = createAction(
  '[Indexer Logs State] Set Logs',
  props<{ logs: LogItem[] }>()
);
