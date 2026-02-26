import { BrowserWindow } from 'electron';
import path from 'path';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const windows = new Map<string, BrowserWindow>();

export function createTerminalWindow(folderPath: string): BrowserWindow {
  const existing = windows.get(folderPath);
  if (existing && !existing.isDestroyed()) {
    existing.focus();
    return existing;
  }

  const win = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 600,
    minHeight: 400,
    title: `文件夹助手 — ${path.basename(folderPath)}`,
    backgroundColor: '#191919',
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}?folder=${encodeURIComponent(folderPath)}`);

  win.once('ready-to-show', () => {
    win.show();
    // win.webContents.openDevTools({ mode: 'bottom' });
  });

  win.on('closed', () => {
    windows.delete(folderPath);
  });

  win.setMenuBarVisibility(false);
  windows.set(folderPath, win);
  return win;
}
