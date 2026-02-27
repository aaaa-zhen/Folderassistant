import { app, nativeImage } from 'electron';
import path from 'path';
import { setupTray } from './tray';
import { createTerminalWindow, createWelcomeWindow } from './windows';
import { registerIpcHandlers } from './ipc-handlers';

// Handle Squirrel events (Windows installer)
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Extract folder path from command line args
  function extractFolderPath(args: string[]): string | null {
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('-')) continue;
      if (arg && !arg.includes('electron') && !arg.includes('.webpack')) {
        return arg;
      }
    }
    return null;
  }

  app.on('second-instance', (_event: Electron.Event, argv: string[]) => {
    const folderPath = extractFolderPath(argv);
    if (folderPath) {
      createTerminalWindow(folderPath);
    }
  });

  app.on('window-all-closed', () => {
    // Don't quit — keep tray alive
  });

  app.whenReady().then(() => {
    // Set dock icon on macOS (dev mode)
    if (process.platform === 'darwin' && app.dock) {
      try {
        const iconPath = path.resolve(__dirname, '..', '..', 'assets', 'icon.icns');
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
          app.dock.setIcon(icon);
        }
      } catch {
        // ignore in dev
      }
    }
    app.setName('文件夹助手');

    registerIpcHandlers();
    setupTray();

    const folderPath = extractFolderPath(process.argv);
    if (folderPath) {
      createTerminalWindow(folderPath);
    } else {
      createWelcomeWindow();
    }
  });
}
