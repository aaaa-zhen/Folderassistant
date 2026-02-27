import { app } from 'electron';
import https from 'https';
import http from 'http';

const UPDATE_URL = 'http://43.134.52.155:3000/api/folder-assistant/version';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  changelog?: string;
  downloadUrl?: string;
  error?: string;
}

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion();
  const currentCode = versionToCode(currentVersion);

  try {
    const info = await fetchJSON(UPDATE_URL);
    const remoteCode = info.versionCode || 0;

    if (remoteCode > currentCode) {
      const platform = process.platform === 'win32' ? 'win32' : 'darwin';
      return {
        hasUpdate: true,
        currentVersion,
        latestVersion: info.versionName,
        changelog: info.changelog || '',
        downloadUrl: info.downloads?.[platform] || '',
      };
    }

    return { hasUpdate: false, currentVersion };
  } catch (err: any) {
    return { hasUpdate: false, currentVersion, error: err.message };
  }
}

function versionToCode(version: string): number {
  // "1.0.0" → 1*10000 + 0*100 + 0 = 10000
  const parts = version.split('.').map(Number);
  return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}
