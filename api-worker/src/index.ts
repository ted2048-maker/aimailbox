import { handleInboxRoutes } from './routes/inbox';
import { handleMessageRoutes } from './routes/messages';
import { corsHeaders, jsonResponse, errorResponse } from './utils/response';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route dispatch

      // POST /inbox - Create inbox
      if (path === '/inbox' && request.method === 'POST') {
        return handleInboxRoutes.create(request, env);
      }

      // GET /inbox/:id - Get inbox info
      const inboxMatch = path.match(/^\/inbox\/([a-z0-9]+)$/);
      if (inboxMatch && request.method === 'GET') {
        return handleInboxRoutes.get(request, env, inboxMatch[1]);
      }

      // DELETE /inbox/:id - Delete inbox
      if (inboxMatch && request.method === 'DELETE') {
        return handleInboxRoutes.delete(request, env, inboxMatch[1]);
      }

      // GET /inbox/:id/messages - List messages
      const messagesMatch = path.match(/^\/inbox\/([a-z0-9]+)\/messages$/);
      if (messagesMatch && request.method === 'GET') {
        return handleMessageRoutes.list(request, env, messagesMatch[1]);
      }

      // GET /inbox/:id/messages/:msgId - Get single message
      const messageMatch = path.match(/^\/inbox\/([a-z0-9]+)\/messages\/(\d+)$/);
      if (messageMatch && request.method === 'GET') {
        return handleMessageRoutes.get(request, env, messageMatch[1], messageMatch[2]);
      }

      // GET /health - Health check
      if (path === '/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      }

      // 404
      return errorResponse('Not Found', 404);
    } catch (error) {
      console.error('API Error:', error);
      return errorResponse('Internal Server Error', 500);
    }
  },
};
