import { Tray, Menu, nativeImage, app, dialog } from 'electron';
import { createTerminalWindow } from './windows';
import { installContextMenu, uninstallContextMenu } from './context-menu-registry';

let tray: Tray | null = null;

export function setupTray(): Tray {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Folder Assistant — Claude Code Launcher');
  tray.setContextMenu(buildTrayMenu());

  tray.on('double-click', () => {
    openFolderPicker();
  });

  return tray;
}

function buildTrayMenu(): Menu {
  const isWindows = process.platform === 'win32';

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Open Folder...',
      click: () => openFolderPicker(),
    },
    { type: 'separator' },
  ];

  if (isWindows) {
    template.push(
      {
        label: 'Install Context Menu',
        click: async () => {
          const result = await installContextMenu();
          if (result.success) {
            dialog.showMessageBox({ type: 'info', title: 'Done', message: 'Right-click context menu installed.' });
          } else {
            dialog.showErrorBox('Error', result.error || 'Failed to install context menu.');
          }
        },
      },
      {
        label: 'Remove Context Menu',
        click: async () => {
          const result = await uninstallContextMenu();
          if (result.success) {
            dialog.showMessageBox({ type: 'info', title: 'Done', message: 'Right-click context menu removed.' });
          } else {
            dialog.showErrorBox('Error', result.error || 'Failed to remove context menu.');
          }
        },
      },
      { type: 'separator' },
    );
  }

  template.push({
    label: 'Quit',
    click: () => app.quit(),
  });

  return Menu.buildFromTemplate(template);
}

async function openFolderPicker(): Promise<void> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Folder to Open with Claude Code',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    createTerminalWindow(result.filePaths[0]);
  }
}

function createTrayIcon(): Electron.NativeImage {
  // 16x16 monochrome folder icon for menu bar / system tray
  // 0 = transparent, 1 = icon color (white on dark, black on light — handled by template)
  const pixels = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];

  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (pixels[y][x] === 1) {
        // On macOS template images use black pixels; the OS inverts for dark mode
        // On Windows use white pixels for dark taskbar
        if (process.platform === 'darwin') {
          buf[i] = 0x00; buf[i+1] = 0x00; buf[i+2] = 0x00; buf[i+3] = 0xff;
        } else {
          buf[i] = 0xff; buf[i+1] = 0xff; buf[i+2] = 0xff; buf[i+3] = 0xff;
        }
      } else {
        buf[i] = 0x00; buf[i+1] = 0x00; buf[i+2] = 0x00; buf[i+3] = 0x00;
      }
    }
  }

  const icon = nativeImage.createFromBuffer(buf, { width: size, height: size });
  // Mark as template image on macOS so it adapts to light/dark menu bar
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }
  return icon;
}
