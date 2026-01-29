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

export interface InboxMeta {
  id: string;
  createdAt: string;
  messageCount: number;
  lastMessageAt: string | null;
  tokenHash?: string; // Optional for backwards compatibility
}

export interface MessageSummary {
  id: string;
  from: string;
  subject: string;
  timestamp: number;
  hasCode: boolean;
}

// KV Key formats
export const KEYS = {
  inboxMeta: (inboxId: string) => `inbox:${inboxId}:meta`,
  message: (inboxId: string, msgId: string) => `inbox:${inboxId}:msg:${msgId}`,
  messageList: (inboxId: string) => `inbox:${inboxId}:messages`,
};

export async function storeMessage(
  kv: KVNamespace,
  inboxId: string,
  message: MessageData,
  ttl: number
): Promise<void> {
  // Store individual message
  await kv.put(KEYS.message(inboxId, message.id), JSON.stringify(message), {
    expirationTtl: ttl,
  });

  // Update message list (store message ID and summary)
  const listKey = KEYS.messageList(inboxId);
  const existingList = ((await kv.get(listKey, 'json')) as MessageSummary[] | null) || [];

  existingList.unshift({
    id: message.id,
    from: message.from,
    subject: message.subject,
    timestamp: message.timestamp,
    hasCode: message.code !== null,
  });

  // Keep only recent messages
  const trimmedList = existingList.slice(0, 100);

  await kv.put(listKey, JSON.stringify(trimmedList), { expirationTtl: ttl });
}

export async function getInboxMeta(kv: KVNamespace, inboxId: string): Promise<InboxMeta | null> {
  const meta = (await kv.get(KEYS.inboxMeta(inboxId), 'json')) as InboxMeta | null;
  return meta;
}

export async function createInboxMeta(kv: KVNamespace, inboxId: string): Promise<InboxMeta> {
  const meta: InboxMeta = {
    id: inboxId,
    createdAt: new Date().toISOString(),
    messageCount: 0,
    lastMessageAt: null,
  };
  await kv.put(KEYS.inboxMeta(inboxId), JSON.stringify(meta));
  return meta;
}

export async function incrementMessageCount(kv: KVNamespace, inboxId: string): Promise<void> {
  let meta = await getInboxMeta(kv, inboxId);

  if (!meta) {
    meta = await createInboxMeta(kv, inboxId);
  }

  meta.messageCount += 1;
  meta.lastMessageAt = new Date().toISOString();

  await kv.put(KEYS.inboxMeta(inboxId), JSON.stringify(meta));
}

export async function getMessageList(kv: KVNamespace, inboxId: string): Promise<MessageSummary[]> {
  const listKey = KEYS.messageList(inboxId);
  const list = (await kv.get(listKey, 'json')) as MessageSummary[] | null;

  return list || [];
}

export async function getMessage(
  kv: KVNamespace,
  inboxId: string,
  msgId: string
): Promise<MessageData | null> {
  const message = (await kv.get(KEYS.message(inboxId, msgId), 'json')) as MessageData | null;
  return message;
}

export async function deleteInbox(kv: KVNamespace, inboxId: string): Promise<void> {
  // Get message list
  const messages = await getMessageList(kv, inboxId);

  // Delete all messages
  for (const msg of messages) {
    await kv.delete(KEYS.message(inboxId, msg.id));
  }

  // Delete message list
  await kv.delete(KEYS.messageList(inboxId));

  // Delete metadata
  await kv.delete(KEYS.inboxMeta(inboxId));
}
