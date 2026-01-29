import { parseEmail } from './parser';
import { extractVerificationCode } from './extractor';
import { storeMessage, inboxExists } from './storage';
import type { MessageData } from './storage';

export interface Env {
  DB: D1Database;
  DOMAIN: string;
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
        console.log(`Invalid inbox ID format: ${inboxId}`);
        return;
      }

      // 3. Check if inbox exists in database
      const exists = await inboxExists(env.DB, inboxId);
      if (!exists) {
        console.log(`Inbox not found, discarding email: ${inboxId}`);
        return;
      }

      // 4. Parse email content
      const rawEmail = await streamToString(message.raw);
      const parsed = await parseEmail(rawEmail);

      // 5. Extract verification code (from subject + body)
      const contentToScan = [
        parsed.subject || '',
        parsed.text || '',
        parsed.html || ''
      ].join(' ');
      const code = extractVerificationCode(contentToScan);

      // 6. Construct message object
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

      // 7. Store to D1
      await storeMessage(env.DB, inboxId, messageData);

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
