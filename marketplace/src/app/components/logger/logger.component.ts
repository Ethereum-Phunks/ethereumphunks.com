import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, viewChild } from '@angular/core';
import { DatePipe, LowerCasePipe, AsyncPipe, NgTemplateOutlet } from '@angular/common';

import { TimeagoModule } from 'ngx-timeago';
import { Store } from '@ngrx/store';
import { tap } from 'rxjs';

import { GlobalState } from '@/models/global-state';
import { selectLogs } from '@/state/indexer-logs/indexer-logs.selectors';
import { setLogsActive } from '@/state/indexer-logs/indexer-logs.actions';

@Component({
  standalone: true,
  imports: [
    AsyncPipe,
    NgTemplateOutlet,
    LowerCasePipe,
    DatePipe,
    TimeagoModule
  ],
  selector: 'app-logger',
  templateUrl: './logger.component.html',
  styleUrl: './logger.component.scss'
})
export class LoggerComponent implements AfterViewInit {

  scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');

  logs$ = this.store.select(selectLogs).pipe(
    tap(() => this.scrollToBottom())
  );

  constructor(
    private store: Store<GlobalState>,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (!this.scroller()?.nativeElement) return;

    setTimeout(() => {
      this.scroller()!.nativeElement.scrollTop = this.scroller()!.nativeElement.scrollHeight;
      this.cdr.detectChanges();
    }, 100);
  }

  closeLogger(): void {
    this.store.dispatch(setLogsActive({ logsActive: false }));
  }
}
