import { Injectable } from '@angular/core';
import { Socket, SocketIoConfig } from 'ngx-socket-io';
import { tap } from 'rxjs';

import { environment } from 'src/environments/environment';

/**
 * Interface representing a log message item
 */
export interface LogItem {
  /** The log message text */
  message: string;
  /** Additional parameters passed with the log */
  optionalParams: any[];
  /** Timestamp when the log was created */
  timestamp: string;
  /** Type of log message */
  type: LogType;
}

/** Valid log message types */
export type LogType = 'log' | 'debug' | 'error';

/** Current chain environment based on chainId */
const chain = environment.chainId === 1 ? 'mainnet' : 'sepolia';

/** Socket.io configuration */
const socketConfig: SocketIoConfig = {
  url: environment.relayUrl,
  options: {
    path: '/socket.io/'
  }
};

/**
 * Service for handling WebSocket connections and log events
 */
@Injectable({
  providedIn: 'root',
})
export class SocketService extends Socket {

  /** Observable stream of individual log messages for current chain */
  log$ = this.fromEvent<LogItem, `log_${typeof chain}`>(`log_${chain}`);

  /** Observable stream of log message arrays for current chain */
  logs$ = this.fromEvent<LogItem[], `logs_${typeof chain}`>(`logs_${chain}`);

  /** Observable stream of pending inscription SHAs */
  // pendingInscriptionShas$ = this.fromEvent<Map<string, string>, 'pendingInscriptionShas'>('pendingInscriptionShas');

  constructor() {
    super(socketConfig);

    this.onMessage().subscribe(({ id, message }) => {
      console.log('received message', { id, message });
    });
  }

  /**
   * Establishes socket connection with optional error callback
   * @param callback Optional error callback function
   */
  connect(callback?: ((err: any) => void) | undefined): this {
    super.connect();
    return this;
  }

  sendMessage(id: string, message: string) {
    this.emit('message', { id, message });
  }

  onMessage() {
    return this.fromEvent<{ id: string, message: string }, 'message'>('message');
  }
}
