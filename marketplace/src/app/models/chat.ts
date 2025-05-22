import { ConsentState, Identifier } from '@xmtp/browser-sdk';

export interface NormalizedMessage {
  id: string;
  content: string;
  timestamp: Date;
  senderInboxId: string;
  self: boolean;
}

export type ViewType = 'conversations' | 'conversation' | 'login' | 'disabled';

export interface NormalizedConversation {
  id: string;
  timestamp: Date;
  peerInboxId: string;
  consentState: ConsentState;
  members: Identifier[];
  latestMessageContent: string;
}

export interface NormalizedConversationWithMessages extends NormalizedConversation {
  messages: NormalizedMessage[];
}
