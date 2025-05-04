export interface TIC {
  topic: string;
  content: string;
  version: string;
  encoding?: 'utf8' | 'base64' | 'hex' | 'json' | 'markdown' | 'ascii';
  type?: 'comment' | 'reaction';
}
