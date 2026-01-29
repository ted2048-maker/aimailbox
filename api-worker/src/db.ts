/**
 * D1 Database Operations
 * Centralized database access layer for AIMailbox
 */

import type { Env, InboxRow, MessageRow, InboxMeta, MessageSummary, MessageData } from './types';

// ==========================================
// Inbox Operations
// ==========================================

export async function createInbox(
  db: D1Database,
  id: string,
  tokenHash: string
): Promise<InboxMeta> {
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO inboxes (id, token_hash, created_at, message_count, last_message_at)
    VALUES (?, ?, ?, 0, NULL)
  `).bind(id, tokenHash, now).run();

  return {
    id,
    tokenHash,
    createdAt: now,
    messageCount: 0,
    lastMessageAt: null,
  };
}

export async function getInbox(
  db: D1Database,
  id: string
): Promise<InboxMeta | null> {
  const result = await db.prepare(`
    SELECT id, token_hash, created_at, message_count, last_message_at
    FROM inboxes
    WHERE id = ?
  `).bind(id).first<InboxRow>();

  if (!result) return null;

  return {
    id: result.id,
    tokenHash: result.token_hash,
    createdAt: result.created_at,
    messageCount: result.message_count,
    lastMessageAt: result.last_message_at,
  };
}

export async function inboxExists(
  db: D1Database,
  id: string
): Promise<boolean> {
  const result = await db.prepare(`
    SELECT 1 FROM inboxes WHERE id = ? LIMIT 1
  `).bind(id).first();

  return result !== null;
}

export async function deleteInbox(
  db: D1Database,
  id: string
): Promise<void> {
  // Messages will be deleted automatically due to ON DELETE CASCADE
  await db.prepare(`
    DELETE FROM inboxes WHERE id = ?
  `).bind(id).run();
}

// ==========================================
// Message Operations
// ==========================================

export async function storeMessage(
  db: D1Database,
  inboxId: string,
  message: {
    id: string;
    from: string;
    fromName: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    code: { code: string; type: string; confidence: number } | null;
    timestamp: number;
    receivedAt: string;
  }
): Promise<void> {
  // Use a transaction to ensure atomicity
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

export async function listMessages(
  db: D1Database,
  inboxId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ messages: MessageSummary[]; total: number }> {
  // Get total count
  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE inbox_id = ?
  `).bind(inboxId).first<{ count: number }>();

  const total = countResult?.count ?? 0;

  // Get messages (newest first)
  const messages = await db.prepare(`
    SELECT id, from_addr, subject, timestamp, code_value
    FROM messages
    WHERE inbox_id = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).bind(inboxId, limit, offset).all<{
    id: string;
    from_addr: string;
    subject: string;
    timestamp: number;
    code_value: string | null;
  }>();

  return {
    messages: (messages.results ?? []).map((row, index) => ({
      index: offset + index + 1,
      id: row.id,
      from: row.from_addr,
      subject: row.subject,
      timestamp: row.timestamp,
      hasCode: row.code_value !== null,
    })),
    total,
  };
}

export async function getMessage(
  db: D1Database,
  inboxId: string,
  messageId: string
): Promise<MessageData | null> {
  const result = await db.prepare(`
    SELECT
      id, inbox_id, from_addr, from_name, to_addr, subject,
      text_content, html_content, code_value, code_type, code_confidence,
      timestamp, received_at
    FROM messages
    WHERE inbox_id = ? AND id = ?
  `).bind(inboxId, messageId).first<MessageRow>();

  if (!result) return null;

  return {
    id: result.id,
    from: result.from_addr,
    fromName: result.from_name,
    to: result.to_addr,
    subject: result.subject,
    text: result.text_content,
    html: result.html_content,
    code: result.code_value ? {
      code: result.code_value,
      type: result.code_type ?? 'unknown',
      confidence: result.code_confidence ?? 0,
    } : null,
    timestamp: result.timestamp,
    receivedAt: result.received_at,
  };
}
