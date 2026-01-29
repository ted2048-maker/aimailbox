/**
 * AIMailbox JavaScript SDK
 * Permissionless email inbox for AI agents and web applications.
 *
 * @example Browser (script tag)
 * ```html
 * <script src="https://unpkg.com/aimailbox-sdk"></script>
 * <script>
 *   const client = new AIMailbox();
 *   const inbox = await client.createInbox();
 *   console.log(inbox.email); // abc123@aimailbox.dev
 * </script>
 * ```
 *
 * @example ES Modules
 * ```javascript
 * import { AIMailbox } from 'aimailbox-sdk';
 * const client = new AIMailbox();
 * const inbox = await client.createInbox();
 * ```
 */

export interface Inbox {
  id: string;
  email: string;
  token: string;
  createdAt: string;
}

export interface MessageSummary {
  index: number;
  id: string;
  from: string;
  subject: string;
  timestamp: number;
  hasCode: boolean;
}

export interface VerificationCode {
  code: string;
  type: 'numeric' | 'alphanumeric' | 'unknown';
  confidence: number;
}

export interface Message {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  code: VerificationCode | null;
  receivedAt: string;
}

export interface ListMessagesResult {
  messages: MessageSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AIMailboxOptions {
  /** API base URL. Defaults to https://api.aimailbox.dev */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30000 */
  timeout?: number;
}

export interface WaitForCodeOptions {
  /** Maximum time to wait in milliseconds. Defaults to 300000 (5 minutes) */
  timeout?: number;
  /** Polling interval in milliseconds. Defaults to 5000 (5 seconds) */
  interval?: number;
  /** Callback for each poll attempt */
  onPoll?: (attempt: number) => void;
}

class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * AIMailbox SDK client.
 * Stateless client for creating and managing temporary email inboxes.
 */
export class AIMailbox {
  private baseUrl: string;
  private timeout: number;

  constructor(options: AIMailboxOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://api.aimailbox.dev';
    this.timeout = options.timeout || 30000;
  }

  private async request<T>(
    method: string,
    path: string,
    token?: string
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!data.success) {
        throw new APIError(
          data.error || 'API request failed',
          response.status,
          data
        );
      }

      return data.data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create a new inbox.
   * Returns inbox details including email address and authentication token.
   *
   * @example
   * ```javascript
   * const inbox = await client.createInbox();
   * console.log(inbox.email);  // abc123@aimailbox.dev
   * console.log(inbox.token);  // Save this token!
   * ```
   */
  async createInbox(): Promise<Inbox> {
    return this.request<Inbox>('POST', '/inbox');
  }

  /**
   * List messages in an inbox.
   *
   * @param inboxId - The inbox ID (e.g., "abc123")
   * @param token - Authentication token
   * @param limit - Maximum number of messages to return (default: 20)
   * @param offset - Number of messages to skip (default: 0)
   *
   * @example
   * ```javascript
   * const result = await client.listMessages(inbox.id, inbox.token);
   * for (const msg of result.messages) {
   *   console.log(`${msg.from}: ${msg.subject}`);
   * }
   * ```
   */
  async listMessages(
    inboxId: string,
    token: string,
    limit = 20,
    offset = 0
  ): Promise<ListMessagesResult> {
    return this.request<ListMessagesResult>(
      'GET',
      `/inbox/${inboxId}/messages?limit=${limit}&offset=${offset}`,
      token
    );
  }

  /**
   * Read a specific message.
   *
   * @param inboxId - The inbox ID
   * @param messageId - The message ID
   * @param token - Authentication token
   *
   * @example
   * ```javascript
   * const msg = await client.readMessage(inbox.id, msgId, inbox.token);
   * console.log(msg.text);
   * if (msg.code) {
   *   console.log(`Verification code: ${msg.code.code}`);
   * }
   * ```
   */
  async readMessage(
    inboxId: string,
    messageId: string,
    token: string
  ): Promise<Message> {
    return this.request<Message>(
      'GET',
      `/inbox/${inboxId}/messages/${messageId}`,
      token
    );
  }

  /**
   * Read the latest message in an inbox.
   *
   * @param inboxId - The inbox ID
   * @param token - Authentication token
   * @returns The latest message, or null if no messages
   */
  async readLatestMessage(
    inboxId: string,
    token: string
  ): Promise<Message | null> {
    const result = await this.listMessages(inboxId, token, 1);
    if (result.messages.length === 0) {
      return null;
    }
    return this.readMessage(inboxId, result.messages[0].id, token);
  }

  /**
   * Delete an inbox and all its messages.
   *
   * @param inboxId - The inbox ID
   * @param token - Authentication token
   */
  async deleteInbox(inboxId: string, token: string): Promise<void> {
    await this.request<void>('DELETE', `/inbox/${inboxId}`, token);
  }

  /**
   * Wait for a verification code to arrive.
   * Polls the inbox until a message with a verification code is found.
   *
   * @param inboxId - The inbox ID
   * @param token - Authentication token
   * @param options - Polling options
   * @returns The verification code, or null if timeout
   *
   * @example
   * ```javascript
   * // Wait up to 5 minutes for a verification code
   * const code = await client.waitForCode(inbox.id, inbox.token, {
   *   timeout: 300000,
   *   interval: 5000,
   *   onPoll: (attempt) => console.log(`Polling attempt ${attempt}...`)
   * });
   *
   * if (code) {
   *   console.log(`Got code: ${code}`);
   * } else {
   *   console.log('Timeout waiting for code');
   * }
   * ```
   */
  async waitForCode(
    inboxId: string,
    token: string,
    options: WaitForCodeOptions = {}
  ): Promise<string | null> {
    const timeout = options.timeout || 300000; // 5 minutes
    const interval = options.interval || 5000; // 5 seconds
    const onPoll = options.onPoll;

    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < timeout) {
      attempt++;
      onPoll?.(attempt);

      try {
        const result = await this.listMessages(inboxId, token, 10);

        // Find any message with a verification code
        for (const summary of result.messages) {
          if (summary.hasCode) {
            const message = await this.readMessage(inboxId, summary.id, token);
            if (message.code) {
              return message.code.code;
            }
          }
        }
      } catch (error) {
        // Ignore errors and continue polling
        console.warn('Poll error:', error);
      }

      // Wait before next poll
      await this.sleep(interval);
    }

    return null;
  }

  /**
   * Create an inbox and wait for a verification code.
   * Convenience method that combines createInbox() and waitForCode().
   *
   * @param options - Wait options
   * @returns Object with inbox details and the verification code (or null)
   *
   * @example
   * ```javascript
   * const { inbox, code } = await client.createAndWaitForCode({
   *   timeout: 120000,
   *   onPoll: (n) => console.log(`Attempt ${n}`)
   * });
   *
   * console.log(`Email: ${inbox.email}`);
   * console.log(`Code: ${code}`);
   * ```
   */
  async createAndWaitForCode(
    options: WaitForCodeOptions = {}
  ): Promise<{ inbox: Inbox; code: string | null }> {
    const inbox = await this.createInbox();
    const code = await this.waitForCode(inbox.id, inbox.token, options);
    return { inbox, code };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export error class
export { APIError };

// Default export for convenience
export default AIMailbox;
