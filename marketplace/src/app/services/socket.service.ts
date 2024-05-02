import { Injectable } from '@angular/core';
import { Socket, SocketIoConfig } from 'ngx-socket-io';

import { environment } from 'src/environments/environment';

export interface LogItem {
  message: string;
  optionalParams: any[];
  timestamp: string;
  type: LogType;
}

export type LogType = 'log' | 'debug' | 'error';

const chain = environment.chainId === 1 ? 'mainnet' : 'sepolia';
const socketConfig: SocketIoConfig = {
  url: environment.relayUrl,
  options: {
    path: '/socket.io/'
  }
};

@Injectable({
  providedIn: 'root',
})
export class SocketService extends Socket {

  log$ = this.fromEvent<LogItem>(`log_${chain}`);
  logs$ = this.fromEvent<LogItem[]>(`logs_${chain}`);

  constructor() {
    super(socketConfig);
  }

  connect(callback?: ((err: any) => void) | undefined) {
    super.connect(callback);
  }
}
