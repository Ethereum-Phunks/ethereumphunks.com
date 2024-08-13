import { Component, Input } from '@angular/core';

import { ConversationComponent } from './conversation/conversation.component';
import { ConversationsComponent } from './conversations/conversations.component';
import { LoginComponent } from './login/login.component';

import { selectChatActive, selectChatConnected, selectChatState } from '@/state/selectors/chat.selectors';
import { GlobalState } from '@/models/global-state';
import { Store } from '@ngrx/store';

import { Observable, map, switchMap, withLatestFrom } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { selectConfig } from '@/state/selectors/app-state.selectors';

// import anime from 'animejs';

type View = 'conversations' | 'conversation' | 'login' | 'disabled';

@Component({
  standalone: true,
  imports: [
    AsyncPipe,

    LoginComponent,
    ConversationsComponent,
    ConversationComponent,
  ],
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {

  activeView$: Observable<View> = this.store.select(selectChatState).pipe(
    switchMap(({ toAddress }) => {
      return this.store.select(selectConfig).pipe(
        switchMap((config) => {
          return this.store.select(selectChatConnected).pipe(
            map((connected) => {
              // console.log({ toAddress, connected, config });

              // if (!config.chat) return 'disabled';
              if (connected) return toAddress ? 'conversation' : 'conversations';
              return 'login';
            })
          )
        })
      );
    }),
  );

  constructor(
    private store: Store<GlobalState>,
  ) {}

  // setView() {
  //   anime.timeline({
  //     easing: 'cubicBezier(0.785, 0.135, 0.15, 0.86)',
  //     duration: 400,
  //   }).add({
  //     targets: this.el?.nativeElement,
  //     translateX: this.active ? '0' : '100%',
  //   });
  // }
}
