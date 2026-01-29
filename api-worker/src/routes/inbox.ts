import { generateUniqueInboxId } from '../utils/id';
import { generateToken, hashToken, verifyToken, extractToken } from '../utils/token';
import { jsonResponse, errorResponse } from '../utils/response';
import { KEYS } from '../types';
import type { Env, InboxMeta, MessageSummary } from '../types';

// Helper to verify token and get inbox meta
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

export const handleInboxRoutes = {
  // POST /inbox - Create new inbox
  async create(request: Request, env: Env): Promise<Response> {
    // Generate unique ID with automatic length expansion
    const inboxId = await generateUniqueInboxId(
      env.INBOX_KV,
      async (id: string) => {
        const existing = await env.INBOX_KV.get(KEYS.inboxMeta(id));
        return existing !== null;
      }
    );

    const token = generateToken();
    const tokenHash = await hashToken(token);

    const meta: InboxMeta = {
      id: inboxId,
      createdAt: new Date().toISOString(),
      messageCount: 0,
      lastMessageAt: null,
      tokenHash: tokenHash,
    };

    await env.INBOX_KV.put(KEYS.inboxMeta(inboxId), JSON.stringify(meta));

    return jsonResponse(
      {
        success: true,
        data: {
          id: inboxId,
          email: `${inboxId}@${env.DOMAIN}`,
          token: token, // Only returned once at creation!
          createdAt: meta.createdAt,
        },
      },
      201
    );
  },

  // GET /inbox/:id - Get inbox info (requires auth)
  async get(request: Request, env: Env, inboxId: string): Promise<Response> {
    const auth = await authenticateInbox(request, env, inboxId);
    if ('error' in auth) {
      return auth.error;
    }

    const { meta } = auth;
    return jsonResponse({
      success: true,
      data: {
        id: meta.id,
        email: `${meta.id}@${env.DOMAIN}`,
        createdAt: meta.createdAt,
        messageCount: meta.messageCount,
        lastMessageAt: meta.lastMessageAt,
      },
    });
  },

  // DELETE /inbox/:id - Delete inbox (requires auth)
  async delete(request: Request, env: Env, inboxId: string): Promise<Response> {
    const auth = await authenticateInbox(request, env, inboxId);
    if ('error' in auth) {
      return auth.error;
    }

    // Get message list and delete all messages
    const messageList =
      ((await env.INBOX_KV.get(KEYS.messageList(inboxId), 'json')) as MessageSummary[]) || [];

    for (const msg of messageList) {
      await env.INBOX_KV.delete(KEYS.message(inboxId, msg.id));
    }

    // Delete message list and metadata
    await env.INBOX_KV.delete(KEYS.messageList(inboxId));
    await env.INBOX_KV.delete(KEYS.inboxMeta(inboxId));

    return jsonResponse({
      success: true,
      message: 'Inbox deleted successfully',
    });
  },

  // Export authenticateInbox for use in message routes
  authenticateInbox,
};
