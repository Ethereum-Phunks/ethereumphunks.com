import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { Store } from '@ngrx/store';

import { TimeagoModule } from 'ngx-timeago';
import { LazyLoadImageModule } from 'ng-lazyload-image';
import { tap } from 'rxjs';

import { GlobalState } from '@/models/global-state';
import { NormalizedConversation } from '@/models/chat';

import { AvatarComponent } from "@/components/avatar/avatar.component";
import { WalletAddressDirective } from '@/directives/wallet-address.directive';

import { selectConversations } from '@/state/chat/chat.selectors';

import { setChat } from '@/state/chat/chat.actions';
@Component({
  imports: [
    AsyncPipe,
    TimeagoModule,
    LazyLoadImageModule,
    WalletAddressDirective,
    AvatarComponent
],
  selector: 'app-conversations',
  standalone: true,
  templateUrl: './conversations.component.html',
  styleUrl: './conversations.component.scss'
})
export class ConversationsComponent {

  conversations$ = this.store.select(selectConversations).pipe(
    // tap((conversations) => {
    //   console.log('ConversationsComponent:conversations', conversations);
    // })
  );

  constructor(
    private store: Store<GlobalState>
  ) {}

  goToConversation(conversation: NormalizedConversation) {
    this.store.dispatch(setChat({
      active: true,
      activeConversationId: conversation.id
    }));
  }
}
