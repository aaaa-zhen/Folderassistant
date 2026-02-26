import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('folderAssistant', {
  detectClaude: () => ipcRenderer.invoke('claude:detect'),
  spawnPty: (folderPath: string) => ipcRenderer.invoke('pty:spawn', folderPath),
  writePty: (data: string) => ipcRenderer.send('pty:write', data),
  resizePty: (cols: number, rows: number) => ipcRenderer.send('pty:resize', cols, rows),
  killPty: () => ipcRenderer.send('pty:kill'),
  onPtyData: (cb: (data: string) => void) => {
    const listener = (_e: any, data: string) => cb(data);
    ipcRenderer.on('pty:data', listener);
    return () => ipcRenderer.removeListener('pty:data', listener);
  },
  onPtyExit: (cb: (code: number) => void) => {
    const listener = (_e: any, code: number) => cb(code);
    ipcRenderer.on('pty:exit', listener);
    return () => ipcRenderer.removeListener('pty:exit', listener);
  },
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (s: any) => ipcRenderer.invoke('settings:save', s),
  getModels: () => ipcRenderer.invoke('settings:models'),
});
