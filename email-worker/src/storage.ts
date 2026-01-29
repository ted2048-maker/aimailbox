import type { ExtractedCode } from './extractor';

export interface MessageData {
  id: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  code: ExtractedCode | null;
  timestamp: number;
  receivedAt: string;
}

/**
 * Check if an inbox exists in the database
 */
export async function inboxExists(
  db: D1Database,
  inboxId: string
): Promise<boolean> {
  const result = await db.prepare(`
    SELECT 1 FROM inboxes WHERE id = ? LIMIT 1
  `).bind(inboxId).first();

  return result !== null;
}

/**
 * Store a message in the database and update inbox metadata
 */
export async function storeMessage(
  db: D1Database,
  inboxId: string,
  message: MessageData
): Promise<void> {
  // Use a batch to ensure atomicity
  const statements = [
    // Insert message
    db.prepare(`
      INSERT INTO messages (
        id, inbox_id, from_addr, from_name, to_addr, subject,
        text_content, html_content, code_value, code_type, code_confidence,
        timestamp, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      message.id,
      inboxId,
      message.from,
      message.fromName,
      message.to,
      message.subject,
      message.text,
      message.html,
      message.code?.code ?? null,
      message.code?.type ?? null,
      message.code?.confidence ?? null,
      message.timestamp,
      message.receivedAt
    ),

    // Update inbox message count and last_message_at
    db.prepare(`
      UPDATE inboxes
      SET message_count = message_count + 1,
          last_message_at = ?
      WHERE id = ?
    `).bind(message.receivedAt, inboxId),
  ];

  await db.batch(statements);
}
