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

    const shortenedMessage = this.shortenHexStrings(message) as string;
    const shortenedOptionalParams = optionalParams.map((param) => this.shortenHexStrings(param));

    this.singleLog.next({
      message: shortenedMessage,
      optionalParams: shortenedOptionalParams,
      timestamp: new Date().toISOString(),
      type: 'log',
    });

    super.log(message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: [...any, string?, string?]): void {

    const shortenedMessage = this.shortenHexStrings(message) as string;
    const shortenedOptionalParams = optionalParams.map((param) => this.shortenHexStrings(param));

    this.singleLog.next({
      message: shortenedMessage,
      optionalParams: shortenedOptionalParams,
      timestamp: new Date().toISOString(),
      type: 'debug',
    });

    super.debug(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: [...any, string?, string?]): void {

    const shortenedMessage = this.shortenHexStrings(message) as string;
    const shortenedOptionalParams = optionalParams.map((param) => this.shortenHexStrings(param));

    this.singleLog.next({
      message: shortenedMessage,
      optionalParams: shortenedOptionalParams,
      timestamp: new Date().toISOString(),
      type: 'error',
    });

    super.error(message, ...optionalParams);
  }

  getLogs(): LogItem[] {
    return this.logCollection.getValue() || [];
  }

  shortenHexStrings(message: string): string {
    try {
      return message?.replace(/0x[a-fA-F0-9]+/g, (match) => {
        if (match.length > 10) {
          return match.substring(0, 6) + '...' + match.substring(match.length - 4);
        } else {
          return match;
        }
      });
    } catch (error) {
      return message;
    }
  }
}
