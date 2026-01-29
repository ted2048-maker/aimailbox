import { parseEmail } from './parser';
import { extractVerificationCode } from './extractor';
import { storeMessage, incrementMessageCount } from './storage';
import type { MessageData } from './storage';

export interface Env {
  INBOX_KV: KVNamespace;
  DOMAIN: string;
  MESSAGE_TTL: number;
  MAX_MESSAGES_PER_INBOX: number;
}

interface EmailMessage {
  readonly from: string;
  readonly to: string;
  readonly raw: ReadableStream<Uint8Array>;
  readonly rawSize: number;
  readonly headers: Headers;
  setReject(reason: string): void;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
}

export default {
  async email(message: EmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      // 1. Parse recipient address to extract inbox_id
      const to = message.to;
      const inboxId = to.split('@')[0].toLowerCase();

      // 2. Validate inbox_id format
      if (!isValidInboxId(inboxId)) {
        // Invalid inbox_id, discard email
        console.log(`Invalid inbox ID: ${inboxId}`);
        return;
      }

      // 3. Parse email content
      const rawEmail = await streamToString(message.raw);
      const parsed = await parseEmail(rawEmail);

      // 4. Extract verification code
      const code = extractVerificationCode(parsed.text || parsed.html || '');

      // 5. Construct message object
      const timestamp = Date.now();
      const messageData: MessageData = {
        id: timestamp.toString(),
        from: parsed.from?.text || parsed.from?.value?.[0]?.address || 'unknown',
        fromName: parsed.from?.value?.[0]?.name || '',
        to: to,
        subject: parsed.subject || '(no subject)',
        text: parsed.text || '',
        html: parsed.html || '',
        code: code,
        timestamp: timestamp,
        receivedAt: new Date(timestamp).toISOString(),
      };

      // 6. Store to KV
      await storeMessage(env.INBOX_KV, inboxId, messageData, env.MESSAGE_TTL);

      // 7. Update inbox metadata
      await incrementMessageCount(env.INBOX_KV, inboxId);

      console.log(`Email stored for inbox ${inboxId}: ${parsed.subject}`);
    } catch (error) {
      // Log error but don't throw to avoid email bounce
      console.error('Error processing email:', error);
    }
  },
};

function isValidInboxId(id: string): boolean {
  // inbox_id should be 4-16 alphanumeric characters
  return /^[a-z0-9]{4,16}$/.test(id);
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  return result;
}
