import { execSync } from 'child_process';
import { app } from 'electron';

interface RegistryResult {
  success: boolean;
  error?: string;
}

const KEY_FOLDER = 'HKCU\\Software\\Classes\\Directory\\shell\\FolderAssistant';
const KEY_BACKGROUND = 'HKCU\\Software\\Classes\\Directory\\Background\\shell\\FolderAssistant';

export async function installContextMenu(): Promise<RegistryResult> {
  if (process.platform !== 'win32') {
    return { success: false, error: 'Only supported on Windows.' };
  }

  try {
    const exePath = process.execPath;
    const appPath = app.isPackaged
      ? exePath
      : `"${exePath}" "${app.getAppPath()}"`;

    for (const key of [KEY_FOLDER, KEY_BACKGROUND]) {
      execSync(`reg add "${key}" /ve /d "Open with Claude Code" /f`, { stdio: 'pipe' });
      execSync(`reg add "${key}" /v Icon /d "${exePath}" /f`, { stdio: 'pipe' });
      execSync(`reg add "${key}\\command" /ve /d "${appPath} \\"%V\\"" /f`, { stdio: 'pipe' });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function uninstallContextMenu(): Promise<RegistryResult> {
  if (process.platform !== 'win32') {
    return { success: false, error: 'Only supported on Windows.' };
  }

  try {
    execSync(`reg delete "${KEY_FOLDER}" /f`, { stdio: 'pipe' });
    execSync(`reg delete "${KEY_BACKGROUND}" /f`, { stdio: 'pipe' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}
