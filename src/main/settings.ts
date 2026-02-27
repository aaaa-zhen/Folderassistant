import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  disableNonessentialTraffic: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  baseUrl: 'https://www.packyapi.com',
  model: 'claude-sonnet-4-6',
  disableNonessentialTraffic: true,
};

const MODELS = [
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
];

function getSettingsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
}

export function loadSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8');
    const saved = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  const dir = path.dirname(getSettingsPath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

export function getAvailableModels(): { id: string; name: string }[] {
  return MODELS;
}
