import { ChatState } from '@/models/global-state';
import { createAction, props } from '@ngrx/store';
import { Conversation } from '@xmtp/xmtp-js';

export const setChat = createAction(
  '[Chat] Set Chat Active',
  props<{ active: boolean, toAddress?: ChatState['toAddress'] }>()
);

export const setChatConnected = createAction(
  '[Chat] Set Chat Connected',
  props<{ connected: boolean }>()
);

export const setConversations = createAction(
  '[Chat] Set Conversations',
  props<{ conversations: Conversation[] }>()
);

export const setActiveConversation = createAction(
  '[Chat] Set Active Conversation',
  props<{ activeConversation: Conversation }>()
);
