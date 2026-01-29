import { jsonResponse, errorResponse } from '../utils/response';
import { verifyToken, extractToken } from '../utils/token';
import * as db from '../db';
import type { Env, InboxMeta } from '../types';

// Helper to verify token and get inbox meta
async function authenticateInbox(
  request: Request,
  env: Env,
  inboxId: string
): Promise<{ meta: InboxMeta } | { error: Response }> {
  const meta = await db.getInbox(env.DB, inboxId);

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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const { messages, total } = await db.listMessages(env.DB, inboxId, limit, offset);

    return jsonResponse({
      success: true,
      data: {
        messages,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
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

    const message = await db.getMessage(env.DB, inboxId, msgId);

    if (!message) {
      return errorResponse('Message not found', 404);
    }

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
