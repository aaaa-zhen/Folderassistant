import { Tray, Menu, nativeImage, app, dialog } from 'electron';
import { createTerminalWindow } from './windows';
import { installContextMenu, uninstallContextMenu } from './context-menu-registry';

let tray: Tray | null = null;

export function setupTray(): Tray {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('文件夹助手 — Claude Code 启动器');
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
      label: '打开文件夹...',
      click: () => openFolderPicker(),
    },
    { type: 'separator' },
  ];

  if (isWindows) {
    template.push(
      {
        label: '安装右键菜单',
        click: async () => {
          const result = await installContextMenu();
          if (result.success) {
            dialog.showMessageBox({ type: 'info', title: '完成', message: '右键菜单已安装。' });
          } else {
            dialog.showErrorBox('错误', result.error || '安装右键菜单失败。');
          }
        },
      },
      {
        label: '卸载右键菜单',
        click: async () => {
          const result = await uninstallContextMenu();
          if (result.success) {
            dialog.showMessageBox({ type: 'info', title: '完成', message: '右键菜单已卸载。' });
          } else {
            dialog.showErrorBox('错误', result.error || '卸载右键菜单失败。');
          }
        },
      },
      { type: 'separator' },
    );
  }

  template.push({
    label: '退出',
    click: () => app.quit(),
  });

  return Menu.buildFromTemplate(template);
}

async function openFolderPicker(): Promise<void> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择文件夹',
  });

  if (!result.canceled && result.filePaths.length > 0) {
    createTerminalWindow(result.filePaths[0]);
  }
}

function createTrayIcon(): Electron.NativeImage {
  // 16x16 pixel art folder icon matching the app logo
  const ICON_DATA = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0],
    [0,2,1,1,1,1,1,2,2,2,2,2,2,2,0,0],
    [0,2,1,1,1,1,1,1,1,1,1,1,1,2,0,0],
    [0,2,1,1,1,1,1,1,1,1,1,1,1,2,0,0],
    [0,2,1,1,4,1,1,1,1,1,1,1,1,2,0,0],
    [0,2,1,1,1,4,1,1,1,5,5,1,1,2,0,0],
    [0,2,1,1,1,1,4,1,1,1,1,5,1,2,0,0],
    [0,2,1,1,1,4,1,1,1,1,5,1,1,2,0,0],
    [0,2,1,1,4,1,1,1,1,5,1,1,1,2,0,0],
    [0,2,1,1,1,1,1,1,1,1,1,1,1,2,0,0],
    [0,2,1,1,1,1,1,1,1,1,1,1,1,2,0,0],
    [0,2,3,3,3,3,3,3,3,3,3,3,3,2,0,0],
    [0,0,2,2,2,2,2,2,2,2,2,2,2,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];

  const PALETTE: Record<number, [number, number, number, number]> = {
    0: [0, 0, 0, 0],
    1: [232, 160, 56, 255],
    2: [212, 130, 40, 255],
    3: [180, 100, 30, 255],
    4: [255, 200, 60, 255],
    5: [30, 30, 40, 255],
  };

  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const c = PALETTE[ICON_DATA[y][x]];
      buf[i] = c[0];
      buf[i + 1] = c[1];
      buf[i + 2] = c[2];
      buf[i + 3] = c[3];
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}
