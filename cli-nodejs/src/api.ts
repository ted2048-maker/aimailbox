import { getApiUrl } from './config.js';
import { getToken } from './store.js';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CreateInboxResponse {
  id: string;
  email: string;
  token: string;
  createdAt: string;
}

interface InboxInfo {
  id: string;
  email: string;
  createdAt: string;
  messageCount: number;
  lastMessageAt: string | null;
}

interface MessageSummary {
  id: string;
  index: number;
  from: string;
  subject: string;
  timestamp: number;
  receivedAt: string;
  hasCode: boolean;
}

interface MessageListResponse {
  messages: MessageSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface MessageDetail {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  code: {
    code: string;
    type: string;
    confidence: number;
  } | null;
  receivedAt: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiUrl();
  }

  private async request<T>(
    path: string,
    options?: RequestInit & { token?: string }
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token is provided
    if (options?.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    const data = (await response.json()) as ApiResponse<T>;

    if (!data.success) {
      throw new Error(data.error || 'API request failed');
    }

    return data.data as T;
  }

  // Resolve token: explicit > stored > null
  private resolveToken(inboxId: string, explicitToken?: string): string | undefined {
    if (explicitToken) {
      return explicitToken;
    }
    const storedToken = getToken(inboxId);
    return storedToken || undefined;
  }

  async createInbox(): Promise<CreateInboxResponse> {
    return this.request<CreateInboxResponse>('/inbox', { method: 'POST' });
  }

  async getInbox(inboxId: string, token?: string): Promise<InboxInfo> {
    const resolvedToken = this.resolveToken(inboxId, token);
    return this.request<InboxInfo>(`/inbox/${inboxId}`, { token: resolvedToken });
  }

  async deleteInbox(inboxId: string, token?: string): Promise<void> {
    const resolvedToken = this.resolveToken(inboxId, token);
    await this.request(`/inbox/${inboxId}`, { method: 'DELETE', token: resolvedToken });
  }

  async listMessages(
    inboxId: string,
    limit = 20,
    offset = 0,
    token?: string
  ): Promise<MessageListResponse> {
    const resolvedToken = this.resolveToken(inboxId, token);
    return this.request<MessageListResponse>(
      `/inbox/${inboxId}/messages?limit=${limit}&offset=${offset}`,
      { token: resolvedToken }
    );
  }

  async getMessage(inboxId: string, msgId: string, token?: string): Promise<MessageDetail> {
    const resolvedToken = this.resolveToken(inboxId, token);
    return this.request<MessageDetail>(`/inbox/${inboxId}/messages/${msgId}`, {
      token: resolvedToken,
    });
  }
}

export const api = new ApiClient();

export type { MessageListResponse, MessageDetail, CreateInboxResponse, InboxInfo };
