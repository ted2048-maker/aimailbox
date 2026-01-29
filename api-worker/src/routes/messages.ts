import { jsonResponse, errorResponse } from '../utils/response';
import { verifyToken, extractToken } from '../utils/token';
import { KEYS } from '../types';
import type { Env, InboxMeta, MessageSummary, MessageData } from '../types';

// Helper to verify token and get inbox meta (duplicated to avoid circular imports)
async function authenticateInbox(
  request: Request,
  env: Env,
  inboxId: string
): Promise<{ meta: InboxMeta } | { error: Response }> {
  const meta = (await env.INBOX_KV.get(KEYS.inboxMeta(inboxId), 'json')) as InboxMeta | null;

  if (!meta) {
    return { error: errorResponse('Inbox not found', 404) };
  }

  const token = extractToken(request);
  if (!token) {
    return { error: errorResponse('Authentication required. Provide token via Authorization header or ?token= query parameter.', 401) };
  }

  const isValid = await verifyToken(token, meta.tokenHash);
  if (!isValid) {
    return { error: errorResponse('Invalid token', 403) };
  }

  return { meta };
}

export const handleMessageRoutes = {
  // GET /inbox/:id/messages - List messages (requires auth)
  async list(request: Request, env: Env, inboxId: string): Promise<Response> {
    const auth = await authenticateInbox(request, env, inboxId);
    if ('error' in auth) {
      return auth.error;
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const messageList =
      ((await env.INBOX_KV.get(KEYS.messageList(inboxId), 'json')) as MessageSummary[]) || [];

    const paginatedList = messageList.slice(offset, offset + limit);

    return jsonResponse({
      success: true,
      data: {
        messages: paginatedList.map((msg, index) => ({
          ...msg,
          index: offset + index + 1,
          receivedAt: new Date(msg.timestamp).toISOString(),
        })),
        pagination: {
          total: messageList.length,
          limit,
          offset,
          hasMore: offset + limit < messageList.length,
        },
      },
    });
  },

  // GET /inbox/:id/messages/:msgId - Get single message (requires auth)
  async get(request: Request, env: Env, inboxId: string, msgId: string): Promise<Response> {
    const auth = await authenticateInbox(request, env, inboxId);
    if ('error' in auth) {
      return auth.error;
    }

    const message = (await env.INBOX_KV.get(KEYS.message(inboxId, msgId), 'json')) as MessageData | null;

    if (!message) {
      return errorResponse('Message not found', 404);
    }

    // Return structured message content (without HTML)
    return jsonResponse({
      success: true,
      data: {
        id: message.id,
        from: message.from,
        fromName: message.fromName,
        to: message.to,
        subject: message.subject,
        text: message.text,
        code: message.code,
        receivedAt: message.receivedAt,
      },
    });
  },
};
