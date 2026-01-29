export interface Env {
  INBOX_KV: KVNamespace;
  DOMAIN: string;
  INBOX_ID_LENGTH: number;
}

export interface InboxMeta {
  id: string;
  createdAt: string;
  messageCount: number;
  lastMessageAt: string | null;
  tokenHash: string; // SHA-256 hash of the token
}

export interface MessageSummary {
  id: string;
  from: string;
  subject: string;
  timestamp: number;
  hasCode: boolean;
}

export interface MessageData {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  code: {
    code: string;
    type: string;
    confidence: number;
  } | null;
  timestamp: number;
  receivedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// KV Key formats (shared with email-worker)
export const KEYS = {
  inboxMeta: (inboxId: string) => `inbox:${inboxId}:meta`,
  message: (inboxId: string, msgId: string) => `inbox:${inboxId}:msg:${msgId}`,
  messageList: (inboxId: string) => `inbox:${inboxId}:messages`,
};
