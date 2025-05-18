export interface Message {
  id: string;
  content: string;
  timestamp: number;
  sender: string;
  self: boolean;
}

export type ViewType = 'conversations' | 'conversation' | 'login' | 'disabled';
