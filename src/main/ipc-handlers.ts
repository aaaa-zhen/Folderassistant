import { ipcMain, dialog, app, shell, IpcMainInvokeEvent, IpcMainEvent } from 'electron';
import * as pty from 'node-pty';
import path from 'path';
import { detectClaude } from './claude-detector';
import { loadSettings, saveSettings, getAvailableModels, AppSettings } from './settings';
import { checkForUpdates } from './updater';

const ptyProcesses = new Map<number, pty.IPty>();

export function registerIpcHandlers(): void {
  ipcMain.handle('claude:detect', () => {
    return detectClaude();
  });

  // Settings
  ipcMain.handle('settings:load', () => {
    return loadSettings();
  });

  ipcMain.handle('settings:save', (_event, settings: AppSettings) => {
    saveSettings(settings);
    return { success: true };
  });

  ipcMain.handle('settings:models', () => {
    return getAvailableModels();
  });

  ipcMain.handle('pty:spawn', (event: IpcMainInvokeEvent, folderPath: string) => {
    const webContents = event.sender;
    const windowId = webContents.id;

    const existing = ptyProcesses.get(windowId);
    if (existing) {
      existing.kill();
      ptyProcesses.delete(windowId);
    }

    const detection = detectClaude();
    let shell: string;
    let shellArgs: string[];

    // Load user settings for API config
    const settings = loadSettings();

    const env = { ...process.env } as Record<string, string>;
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE;
    env.TERM = 'xterm-256color';
    env.COLORTERM = 'truecolor';

    // Apply user API settings
    if (settings.apiKey) {
      env.ANTHROPIC_AUTH_TOKEN = settings.apiKey;
    }
    if (settings.baseUrl) {
      env.ANTHROPIC_BASE_URL = settings.baseUrl;
    }
    // Model will be passed via --model flag below
    if (settings.disableNonessentialTraffic) {
      env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
    }

    // Build extra CLI flags
    const extraFlags: string[] = [];
    if (settings.model) {
      extraFlags.push('--model', settings.model);
    }
    const extraFlagsStr = extraFlags.length > 0 ? ' ' + extraFlags.join(' ') : '';

    if (detection.mode === 'system') {
      shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
      shellArgs = process.platform === 'win32'
        ? ['/c', `claude${extraFlagsStr}`]
        : ['-l', '-c', `claude${extraFlagsStr}`];
    } else if (detection.mode === 'bundled' && detection.claudePath) {
      // Use Electron as Node.js to run the bundled CLI
      env.ELECTRON_RUN_AS_NODE = '1';
      env.NODE_NO_WARNINGS = '1';

      // cli.js is ESM — write a temp CJS launcher that uses dynamic import()
      const os = require('os');
      const fs = require('fs');
      const launcherPath = path.join(os.tmpdir(), 'fa-claude-launcher.cjs');
      const cliFileUrl = 'file:///' + detection.claudePath.replace(/\\/g, '/');
      fs.writeFileSync(launcherPath,
        `import(${JSON.stringify(cliFileUrl)}).catch(e => { console.error(e); process.exit(1); });\n`
      );

      shell = process.execPath;
      shellArgs = [launcherPath, ...extraFlags];
    } else {
      throw new Error('Claude CLI 不可用');
    }

    // Log spawn info for debugging
    const debugInfo = {
      mode: detection.mode,
      shell,
      shellArgs,
      claudePath: detection.claudePath,
      execPath: process.execPath,
      platform: process.platform,
      nodeVersion: process.version,
    };
    try {
      const os = require('os');
      const fs = require('fs');
      const path = require('path');
      fs.writeFileSync(
        path.join(os.tmpdir(), 'folder-assistant-spawn.log'),
        JSON.stringify(debugInfo, null, 2) + '\n'
      );
    } catch {}

    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: folderPath,
      env,
    });

    ptyProcesses.set(windowId, ptyProcess);

    ptyProcess.onData((data: string) => {
      if (!webContents.isDestroyed()) {
        webContents.send('pty:data', data);
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      ptyProcesses.delete(windowId);
      if (!webContents.isDestroyed()) {
        webContents.send('pty:exit', exitCode);
      }
    });

    return { pid: ptyProcess.pid };
  });

  ipcMain.on('pty:write', (event: IpcMainEvent, data: string) => {
    const ptyProcess = ptyProcesses.get(event.sender.id);
    if (ptyProcess) ptyProcess.write(data);
  });

  ipcMain.on('pty:resize', (event: IpcMainEvent, cols: number, rows: number) => {
    const ptyProcess = ptyProcesses.get(event.sender.id);
    if (ptyProcess) ptyProcess.resize(cols, rows);
  });

  ipcMain.on('pty:kill', (event: IpcMainEvent) => {
    const ptyProcess = ptyProcesses.get(event.sender.id);
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcesses.delete(event.sender.id);
    }
  });

  ipcMain.handle('updater:check', async () => {
    return checkForUpdates();
  });

  ipcMain.handle('updater:openDownload', async (_event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择文件夹',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

app.on('will-quit', () => {
  for (const p of ptyProcesses.values()) p.kill();
  ptyProcesses.clear();
});
