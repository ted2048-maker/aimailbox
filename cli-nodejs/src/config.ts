import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

interface Config {
  apiUrl: string;
  defaultInbox?: string;
}

const CONFIG_DIR = join(homedir(), '.aimailbox');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: Config = {
  apiUrl: 'https://api.aimailbox.dev',
};

export function getConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Partial<Config>): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const currentConfig = getConfig();
  const newConfig = { ...currentConfig, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
}

export function getApiUrl(): string {
  return process.env.AIMAILBOX_API_URL || getConfig().apiUrl;
}
