import { generateUniqueInboxId } from '../utils/id';
import { generateToken, hashToken, verifyToken, extractToken } from '../utils/token';
import { jsonResponse, errorResponse } from '../utils/response';
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

export const handleInboxRoutes = {
  // POST /inbox - Create new inbox
  async create(request: Request, env: Env): Promise<Response> {
    // Generate unique ID with automatic length expansion
    const inboxId = await generateUniqueInboxId(
      env.DB,
      async (id: string) => {
        return await db.inboxExists(env.DB, id);
      }
    );

    const token = generateToken();
    const tokenHash = await hashToken(token);

    const meta = await db.createInbox(env.DB, inboxId, tokenHash);

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

    await db.deleteInbox(env.DB, inboxId);

    return jsonResponse({
      success: true,
      message: 'Inbox deleted successfully',
    });
  },

  // Export authenticateInbox for use in message routes
  authenticateInbox,
};
