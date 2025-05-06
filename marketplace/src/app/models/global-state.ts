import { DataState } from './data.state';
import { MarketState } from './market.state';

import { Theme } from './theme';
import { Conversation } from '@xmtp/xmtp-js';

export interface GlobalState {
  appState: AppState;
  dataState: DataState;
  marketState: MarketState;
  notificationState: NotificationState;
  chatState: ChatState;
}

export interface AppState {
  walletAddress: string | undefined;
  connected: boolean;
  hasWithdrawal: number;
  isBanned: boolean;
  userPoints: number;
  activeMultiplier: number;
  theme: Theme;

  isMobile: boolean;
  menuActive: boolean;
  activeMenuNav: 'main' | 'leaderboard' | 'curated';
  slideoutActive: boolean;

  eventTypeFilter: EventType;
  eventPage: number;

  scrollPositions: { [navigationId: number]: number };

  currentBlock: number;
  indexerBlock: number;
  blocksBehind: number;

  cooldowns: Cooldowns;

  searchHistory: HistoryItem[];
  searchHistoryActive: boolean;
  isSearchResult: boolean;

  modalActive: boolean;
  collectionsMenuActive: boolean;

  config: GlobalConfig;

  linkedAccounts: LinkedAccount[];
}

export interface LinkedAccount {
  address: string;
}

export interface GlobalConfig {
  network: number | null;
  maintenance: boolean;
  chat: boolean;
  comments: boolean;
  defaultCollection: string | null;
};

export interface ChatState {
  active: boolean;
  toAddress: string | null | undefined;
  connected: boolean;
  conversations: Conversation[];
  activeConversation: Conversation | null;
}

export interface NotificationState {
  notifications: Notification[];
  notifHoverState: { [notificationId: string]: boolean };
}

export interface HistoryItem { type: string; value: string };

export interface Cooldowns {
  [hashId: string]: number;
}

export interface Notification {
  id: string;
  timestamp: number;

  type: 'wallet' | 'pending' | 'complete' | 'error' | 'event' | 'chat';
  function: TxFunction;

  sha?: string;
  hashId?: string;
  chatAddress?: string;
  slug?: string;
  tokenId?: number | null;

  isBatch?: boolean;
  hashIds?: string[];

  isNotification?: boolean;
  dismissed?: boolean;

  hash?: string | null;
  detail?: any;
  value?: number | null;
}

export type TxFunction =
  | 'sendToEscrow'
  | 'phunkNoLongerForSale'
  | 'offerPhunkForSale'
  | 'withdrawBidForPhunk'
  | 'acceptBidForPhunk'
  | 'buyPhunk'
  | 'enterBidForPhunk'
  | 'transferPhunk'
  | 'withdrawPhunk'
  | 'purchased'
  | 'chatMessage'
  | 'bridgeOut'
  | 'bridgeIn'
  | 'mint'
  | 'tic'
  | 'ticDelete';

export interface TraitFilter {
  [key: string]: string | null;
}

export interface TxFilterItem {
  label: string;
  value: EventType;
}

export type EventType =
  | 'All'
  | 'created'
  | 'transfer'
  | 'escrow'
  | 'PhunkOffered'
  | 'PhunkBidEntered'
  | 'PhunkBidWithdrawn'
  | 'PhunkBought'
  | 'PhunkNoLongerForSale'
  | 'bridgeOut'
  | 'bridgeIn';
