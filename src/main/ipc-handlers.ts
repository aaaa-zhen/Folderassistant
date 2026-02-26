import { ipcMain, dialog, app, IpcMainInvokeEvent, IpcMainEvent } from 'electron';
import * as pty from 'node-pty';
import { detectClaude } from './claude-detector';
import { loadSettings, saveSettings, getAvailableModels, AppSettings } from './settings';

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

    if (detection.mode === 'system') {
      shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/zsh';
      shellArgs = process.platform === 'win32'
        ? ['/c', 'claude']
        : ['-l', '-c', 'claude'];
    } else if (detection.mode === 'bundled' && detection.claudePath) {
      shell = process.execPath;
      shellArgs = [detection.claudePath];
    } else {
      throw new Error('Claude CLI not available');
    }

    const ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: folderPath,
      env: (() => {
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
        if (settings.model) {
          env.ANTHROPIC_MODEL = settings.model;
        }
        if (settings.disableNonessentialTraffic) {
          env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';
        }

        if (detection.mode === 'bundled') {
          env.ELECTRON_RUN_AS_NODE = '1';
        }
        return env;
      })(),
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
