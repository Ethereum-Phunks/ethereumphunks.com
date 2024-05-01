import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { BehaviorSubject, filter, scan, tap } from 'rxjs';

export interface LogItem {
  message: string;
  optionalParams: any[];
  timestamp: string;
  type: LogType;
}

export type LogType = 'log' | 'debug' | 'error';

@Injectable()
export class CustomLogger extends ConsoleLogger {

  private singleLog = new BehaviorSubject<LogItem | null>(null);
  singleLog$ = this.singleLog.asObservable();

  private logCollection = new BehaviorSubject<LogItem[] | null>(null);
  logCollection$ = this.logCollection.asObservable();

  constructor() {
    super();

    this.singleLog$.pipe(
      filter(log => log !== null),
      scan((acc: LogItem[], log: LogItem) => [...acc, log].slice(-100), []),
      tap(logs => this.logCollection.next(logs))
    ).subscribe();
  }

  log(message: any, ...optionalParams: [...any, string?, string?]): void {
    // console.log('CustomLogger.log', message, optionalParams);
    this.singleLog.next({
      message,
      optionalParams,
      timestamp: new Date().toISOString(),
      type: 'log',
    });

    super.log(message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: [...any, string?, string?]): void {
    this.singleLog.next({
      message,
      optionalParams,
      timestamp: new Date().toISOString(),
      type: 'debug',
    });

    super.debug(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: [...any, string?, string?]): void {
    this.singleLog.next({
      message,
      optionalParams,
      timestamp: new Date().toISOString(),
      type: 'error',
    });

    super.error(message, ...optionalParams);
  }

  getLogs(): LogItem[] {
    return this.logCollection.getValue() || [];
  }

}
