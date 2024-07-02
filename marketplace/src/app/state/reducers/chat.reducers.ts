import { AppState, ChatState } from '@/models/global-state';
import { Action, ActionReducer, createReducer, on } from '@ngrx/store';

import * as actions from '../actions/chat.actions';

export const initialState: ChatState = {
  active: false,
  connected: false,
  conversations: [],
  activeConversation: null,
  toAddress: null,
};

export const chatReducer: ActionReducer<ChatState, Action> = createReducer(
  initialState,
  on(actions.setChat, (state, { active, toAddress }) => {
    return { ...state, active, toAddress };
  }),
  on(actions.setChatConnected, (state, { connected }) => {
    return { ...state, connected };
  }),
  on(actions.setConversations, (state, { conversations }) => {
    return { ...state, conversations };
  }),
  on(actions.setActiveConversation, (state, { activeConversation }) => {
    return { ...state, activeConversation };
  }),
);
