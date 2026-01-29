export interface Env {
  DB: D1Database;
  DOMAIN: string;
  INBOX_ID_LENGTH: number;
}

export interface InboxMeta {
  id: string;
  createdAt: string;
  messageCount: number;
  lastMessageAt: string | null;
  tokenHash: string;
}

export interface MessageSummary {
  index: number;
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

// D1 Row types (matching database schema)
export interface InboxRow {
  id: string;
  token_hash: string;
  created_at: string;
  message_count: number;
  last_message_at: string | null;
}

export interface MessageRow {
  id: string;
  inbox_id: string;
  from_addr: string;
  from_name: string;
  to_addr: string;
  subject: string;
  text_content: string;
  html_content: string;
  code_value: string | null;
  code_type: string | null;
  code_confidence: number | null;
  timestamp: number;
  received_at: string;
}
