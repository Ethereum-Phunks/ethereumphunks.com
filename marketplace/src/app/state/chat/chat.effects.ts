import { Injectable } from '@angular/core';

import { Store } from '@ngrx/store';

import { Actions, createEffect, ofType } from '@ngrx/effects';

import { GlobalState } from '@/models/global-state';

import { from, map, switchMap, tap, distinctUntilChanged, filter, withLatestFrom } from 'rxjs';

import { ChatService } from '@/services/chat.service';
import { DataService } from '@/services/data.service';

import { setWalletAddress } from '@/state/app/app-state.actions';
import { setChatConnected, setHasAccount, setConversations, setChat, setActiveConversation } from './chat.actions';
import { selectWalletAddress } from '../app/app-state.selectors';

@Injectable()
export class ChatEffects {

  hasAccount$ = createEffect(() => this.actions$.pipe(
    ofType(setWalletAddress),
    distinctUntilChanged((prev, curr) => prev.walletAddress === curr.walletAddress),
    switchMap(({ walletAddress }) => {
      return from(this.chatSvc.hasStoredUserSalt(walletAddress as `0x${string}`));
    }),
    tap((hasAccount) => {
      console.log('Has account', { hasAccount });
    }),
    map((hasAccount) => setHasAccount({ hasAccount })),
  ));

  conversations$ = createEffect(() => this.actions$.pipe(
    ofType(setChatConnected),
    withLatestFrom(this.store.select(selectWalletAddress)),
    tap(([{ connected }, walletAddress]) => console.log('conversations$', { connected, walletAddress })),
    filter(([{ connected }, walletAddress]) => connected && !!walletAddress),
    switchMap(([_, walletAddress]) => this.chatSvc.listAndStreamAllDms(walletAddress?.toLowerCase() as `0x${string}`)),
    switchMap((convos) => {
      const addresses = convos.map(convo => convo.members[0].identifier?.toLowerCase());
      return this.dataSvc.addressesAreHolders(addresses).pipe(
        map((allowed) => {
          const allowedAddresses = allowed.map((res: any) => res.address);
          return convos.filter((convo) => {
            return allowedAddresses.includes(convo.members[0].identifier?.toLowerCase());
          });
        })
      );
    }),
    map((conversations) => setConversations({ conversations })),
  ));

  activeConversation$ = createEffect(() => this.actions$.pipe(
    ofType(setChat),
    filter(({ activeConversationId }) => !!activeConversationId),
    switchMap(({ activeConversationId }) => {
      return this.chatSvc.getAndStreamConversationMessages(activeConversationId!);
    }),
    tap((conversation) => {
      console.log('activeConversation$', conversation);
    }),
    map((conversation) => setActiveConversation({ conversation })),
  ));

  constructor(
    private store: Store<GlobalState>,
    private actions$: Actions,
    private chatSvc: ChatService,
    private dataSvc: DataService,
  ) {}
}
