import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

interface TokenStore {
  [inboxId: string]: string;
}

const CONFIG_DIR = join(homedir(), '.aimailbox');
const TOKENS_FILE = join(CONFIG_DIR, 'tokens.json');

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadTokens(): TokenStore {
  if (!existsSync(TOKENS_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(TOKENS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function saveTokens(tokens: TokenStore): void {
  ensureConfigDir();
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export function storeToken(inboxId: string, token: string): void {
  const tokens = loadTokens();
  tokens[inboxId] = token;
  saveTokens(tokens);
}

export function getToken(inboxId: string): string | null {
  const tokens = loadTokens();
  return tokens[inboxId] || null;
}

export function removeToken(inboxId: string): void {
  const tokens = loadTokens();
  delete tokens[inboxId];
  saveTokens(tokens);
}

export function listStoredInboxes(): Array<{ id: string; email: string }> {
  const tokens = loadTokens();
  return Object.keys(tokens).map((id) => ({
    id,
    email: `${id}@aimailbox.dev`,
  }));
}
