import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { NavigationEnd, NavigationStart, Router, RouterModule } from '@angular/router';

import { Store } from '@ngrx/store';
import { WaIntersectionObserver } from '@ng-web-apis/intersection-observer';

import { GlobalState } from '@/models/global-state';

import { HeaderComponent } from '@/components/header/header.component';
import { FooterComponent } from '@/components/footer/footer.component';
import { MenuComponent } from '@/components/menu/menu.component';
import { NotificationsComponent } from '@/components/notifications/notifications.component';
import { StatusBarComponent } from '@/components/status-bar/status-bar.component';
import { ModalComponent } from '@/components/modal/modal.component';
import { ChatComponent } from '@/components/chat/chat.component';

import { Web3Service } from '@/services/web3.service';
import { DataService } from '@/services/data.service';
import { ThemeService } from '@/services/theme.service';
import { PwaUpdateService } from '@/services/pwa-update.service';

import { selectChatActive } from '@/state/selectors/chat.selectors';
import { selectIsMobile } from '@/state/selectors/app-state.selectors';

import * as appStateActions from '@/state/actions/app-state.actions';
import * as dataStateActions from '@/state/actions/data-state.actions';

import { asyncScheduler, fromEvent, debounceTime, filter, map, observeOn, scan, tap, withLatestFrom } from 'rxjs';

import { environment } from 'src/environments/environment';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    WaIntersectionObserver,

    MenuComponent,
    HeaderComponent,
    FooterComponent,
    NotificationsComponent,
    StatusBarComponent,
    ModalComponent,
    ChatComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {

  env = environment;

  chatActive$ = this.store.select(selectChatActive).pipe(map(({ active }) => active));

  statusBarVisible = signal(true);

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private store: Store<GlobalState>,
    public dataSvc: DataService,
    public web3Svc: Web3Service,
    public themeSvc: ThemeService,
    private router: Router,
    private pwaUpdateSvc: PwaUpdateService,
  ) {
    this.store.dispatch(appStateActions.setTheme({ theme: 'initial' }));
    this.store.dispatch(appStateActions.initGlobalConfig());
    this.store.dispatch(dataStateActions.fetchCollections());
    this.store.dispatch(appStateActions.fetchActiveMultiplier());

    this.setStatusBarVisible();
  }

  ngOnInit(): void {
    this.router.events.pipe(
      ////////////////////////
      // Scroll restoration //
      ////////////////////////
      filter((event) => event instanceof NavigationStart || event instanceof NavigationEnd),
      scan((acc: any, event: any) => {
        return {
          event,
          positions: {
            ...acc.positions,
            ...(event instanceof NavigationStart ? { [event.id]: window.scrollY } : {}),
          },
          trigger: event instanceof NavigationStart ? event.navigationTrigger : acc.trigger,
          idToRestore: (event instanceof NavigationStart && event.restoredState && event.restoredState.navigationId + 1) || acc.idToRestore,
        };
      }),
      filter(({ event, trigger }) => event instanceof NavigationEnd && !!trigger),
      observeOn(asyncScheduler),
      tap(({ trigger, positions, idToRestore }) => {
        setTimeout(() => {
          if (trigger === 'imperative') window.scrollTo(0, 0);
          if (trigger === 'popstate') window.scrollTo(0, positions[idToRestore] || 0);
        }, 0);
      })
    ).subscribe();

    fromEvent(this.document, 'mouseup').pipe(
      tap(($event: Event) => {
        $event.stopPropagation();
        this.store.dispatch(appStateActions.mouseUp({ event: $event as MouseEvent }));
      })
    ).subscribe();

    fromEvent(this.document, 'mousedown').pipe(
      tap(($event: Event) => {
        $event.stopPropagation();
        this.store.dispatch(appStateActions.mouseDown({ event: $event as MouseEvent }));
      })
    ).subscribe();

    fromEvent(window, 'resize').pipe(
      debounceTime(100),
      tap(() => {
        this.setIsMobile();
        this.setStatusBarVisible();
      })
    ).subscribe();

    // scroll event
    fromEvent(window, 'scroll').pipe(
      withLatestFrom(this.store.select(selectIsMobile)),
      filter(([_, isMobile]) => !!isMobile),
      tap(([$event, isMobile]) => this.setStatusBarVisible())
    ).subscribe();

    this.setIsMobile();
    this.pwaUpdateSvc.checkForUpdate();
  }

  setIsMobile(): void {
    this.store.dispatch(appStateActions.setIsMobile({ isMobile: window.innerWidth < 801 }))
  }

  setStatusBarVisible() {
    if (window.innerWidth > 800) {
      this.statusBarVisible.set(true);
    } else {
      const scrollY = window.scrollY;
      this.statusBarVisible.set(scrollY > 100);
    }
  }
}
