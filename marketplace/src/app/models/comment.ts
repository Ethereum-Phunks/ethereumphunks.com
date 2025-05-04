type EncodingType = 'utf8' | 'base64' | 'hex' | 'json' | 'markdown' | 'ascii';

type CommentType =
  | 'comment' // Basic comment
  | 'reaction' // Like/emoji reaction to content

export interface Comment {
  topic: string;
  content: string;
  version: string;
  encoding?: EncodingType;
  type?: CommentType;
};

export interface DBComment {
  id: string;
  topic: string;
  topicType: string;
  content: string;
  version: string;
  createdAt: Date;
  from: string;
  deleted?: boolean;
  encoding?: string;
  type?: string;
}

export interface CommentWithReplies extends DBComment {
  replies?: DBComment[];
}
