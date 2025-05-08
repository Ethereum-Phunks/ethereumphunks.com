import { isDevMode } from '@angular/core';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient } from '@angular/common/http';

import { TimeagoClock, TimeagoDefaultClock, TimeagoDefaultFormatter, TimeagoFormatter } from 'ngx-timeago';

import { routes } from '@/routes/routes';
import { CustomReuseStrategy } from '@/routes/route.strategy';

import { Store, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouterStore, routerReducer } from '@ngrx/router-store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { appStateReducer } from '@/state/reducers/app-state.reducers';
import { dataStateReducer } from '@/state/reducers/data-state.reducers';
import { marketStateReducer } from '@/state/reducers/market-state.reducers';
import { notificationReducer } from '@/state/reducers/notification.reducers';
import { chatReducer } from '@/state/reducers/chat.reducers';

import { AppStateEffects } from '@/state/effects/app-state.effects';
import { DataStateEffects } from '@/state/effects/data-state.effects';
import { MarketStateEffects } from '@/state/effects/market-state.effects';
import { NotificationEffects } from '@/state/effects/notification.effects';
import { ChatEffects } from '@/state/effects/chat.effects';

import { TokenIdParsePipe } from '@/pipes/token-id-parse.pipe';
import { WeiToEthPipe } from '@/pipes/wei-to-eth.pipe';
import { MinMaxPipe } from '@/pipes/min-max';

export const config = {
  providers: [
    { provide: TimeagoFormatter, useClass: TimeagoDefaultFormatter },
    { provide: TimeagoClock, useClass: TimeagoDefaultClock },
    { provide: WeiToEthPipe, useClass: WeiToEthPipe },
    { provide: MinMaxPipe, useClass: MinMaxPipe },
    { provide: TokenIdParsePipe, useClass: TokenIdParsePipe },
    { provide: RouteReuseStrategy, useClass: CustomReuseStrategy },
    provideStore({
      appState: appStateReducer,
      dataState: dataStateReducer,
      marketState: marketStateReducer,
      notificationState: notificationReducer,
      chatState: chatReducer,
      router: routerReducer
    }),
    provideEffects([
      AppStateEffects,
      DataStateEffects,
      MarketStateEffects,
      NotificationEffects,
      ChatEffects
    ]),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
      trace: true,
      serialize: false
    }),
    provideRouterStore(),
    provideHttpClient(),
    provideRouter(
      routes,
      // withHashLocation(),
    ),
    provideServiceWorker('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000'
    })
]
}
