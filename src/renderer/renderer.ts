import '@xterm/xterm/css/xterm.css';
import './styles.css';
import { TerminalManager } from './terminal-manager';

let terminalManager: TerminalManager | null = null;

// Pixel art icon data (16x16)
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

function drawPixelIcon(canvas: HTMLCanvasElement, size: number): void {
  const ctx = canvas.getContext('2d')!;
  const scale = size / 16;
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const c = PALETTE[ICON_DATA[y][x]];
      if (c[3] === 0) continue;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

/** Get friendly folder display name: "Folderassistant" from full path */
function getFolderDisplayName(fullPath: string): string {
  const parts = fullPath.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || fullPath;
}

async function init(): Promise<void> {
  const welcomeView = document.getElementById('welcome-view') as HTMLDivElement;
  const terminalView = document.getElementById('terminal-view') as HTMLDivElement;
  const terminalContainer = document.getElementById('terminal-container') as HTMLDivElement;
  const topFolderName = document.getElementById('top-folder-name') as HTMLSpanElement;
  const errorOverlay = document.getElementById('error-overlay') as HTMLDivElement;
  const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;

  const inputBar = document.getElementById('input-bar') as HTMLDivElement;
  const btnFolder = document.getElementById('btn-folder') as HTMLButtonElement;
  const btnChangeFolder = document.getElementById('btn-change-folder') as HTMLButtonElement;

  // Settings elements
  const settingsMask = document.getElementById('settings-mask') as HTMLDivElement;
  const settingApiKey = document.getElementById('setting-api-key') as HTMLInputElement;
  const settingModel = document.getElementById('setting-model') as HTMLSelectElement;
  const btnSettingsWelcome = document.getElementById('btn-settings-welcome') as HTMLButtonElement;
  const btnSettingsTop = document.getElementById('btn-settings-top') as HTMLButtonElement;
  const btnSettingsCancel = document.getElementById('btn-settings-cancel') as HTMLButtonElement;
  const btnSettingsSave = document.getElementById('btn-settings-save') as HTMLButtonElement;

  // Draw pixel art logos
  drawPixelIcon(document.getElementById('logo-canvas') as HTMLCanvasElement, 80);
  drawPixelIcon(document.getElementById('top-logo') as HTMLCanvasElement, 24);

  // Load model list
  const models = await window.folderAssistant.getModels();
  models.forEach((m: { id: string; name: string }) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    settingModel.appendChild(opt);
  });

  // Settings modal handlers
  async function openSettings(): Promise<void> {
    const settings = await window.folderAssistant.loadSettings();
    settingApiKey.value = settings.apiKey || '';
    settingModel.value = settings.model || 'claude-sonnet-4-6';
    settingsMask.classList.remove('hidden');
  }

  function closeSettings(): void {
    settingsMask.classList.add('hidden');
  }

  btnSettingsWelcome.addEventListener('click', (e) => { e.stopPropagation(); openSettings(); });
  btnSettingsTop.addEventListener('click', openSettings);
  const btnSettingsClose = document.getElementById('btn-settings-close') as HTMLButtonElement;
  btnSettingsClose.addEventListener('click', closeSettings);
  btnSettingsCancel.addEventListener('click', closeSettings);
  settingsMask.addEventListener('click', (e) => { if (e.target === settingsMask) closeSettings(); });

  // Check update button in settings
  const btnCheckUpdate = document.getElementById('btn-check-update') as HTMLButtonElement;
  const versionInfo = document.getElementById('version-info') as HTMLParagraphElement;

  btnCheckUpdate.addEventListener('click', async () => {
    btnCheckUpdate.textContent = '检查中...';
    btnCheckUpdate.disabled = true;
    try {
      const info = await window.folderAssistant.checkForUpdates();
      if (info.hasUpdate) {
        versionInfo.textContent = '';
        closeSettings();
        showUpdateModal(info);
      } else {
        versionInfo.textContent = `当前版本 ${info.currentVersion}，已是最新`;
        versionInfo.style.color = '#9ece6a';
      }
    } catch {
      versionInfo.textContent = '检查失败，请稍后重试';
      versionInfo.style.color = '#f7768e';
    }
    btnCheckUpdate.textContent = '检查更新';
    btnCheckUpdate.disabled = false;
  });

  btnSettingsSave.addEventListener('click', async () => {
    await window.folderAssistant.saveSettings({
      apiKey: settingApiKey.value.trim(),
      baseUrl: 'https://www.packyapi.com',
      model: settingModel.value,
      disableNonessentialTraffic: true,
    });
    closeSettings();
  });

  // Extract folder path from URL
  const params = new URLSearchParams(window.location.search);
  let currentFolder = params.get('folder');
  if (currentFolder) currentFolder = decodeURIComponent(currentFolder);

  async function pickFolder(): Promise<void> {
    const selected = await window.folderAssistant.openFolderDialog();
    if (selected) {
      if (terminalManager) {
        terminalManager.dispose();
        terminalManager = null;
      }
      currentFolder = selected;
      await startTerminal(currentFolder);
    }
  }

  inputBar.addEventListener('click', pickFolder);
  btnFolder.addEventListener('click', (e) => { e.stopPropagation(); pickFolder(); });
  btnChangeFolder.addEventListener('click', pickFolder);

  // Check for updates (non-blocking, delayed)
  setTimeout(() => checkUpdates(), 2000);

  if (currentFolder) {
    await startTerminal(currentFolder);
  }

  async function startTerminal(folder: string): Promise<void> {
    errorOverlay.classList.add('hidden');

    // Show friendly folder name in top bar chip
    topFolderName.textContent = getFolderDisplayName(folder);
    topFolderName.title = folder; // full path on hover

    const detection = await window.folderAssistant.detectClaude();

    if (!detection.found) {
      errorOverlay.classList.remove('hidden');
      errorMessage.textContent = detection.error || 'Claude CLI 未找到。';
      return;
    }

    // Switch to terminal view
    welcomeView.classList.add('hidden');
    terminalView.classList.remove('hidden');

    terminalManager = new TerminalManager(terminalContainer);
    try {
      await terminalManager.start(folder);
      terminalManager.focus();
    } catch (e: any) {
      errorOverlay.classList.remove('hidden');
      const msg = e.message || '终端启动失败';
      errorMessage.style.whiteSpace = 'pre-wrap';
      errorMessage.style.wordBreak = 'break-all';
      errorMessage.style.fontSize = '12px';
      errorMessage.style.textAlign = 'left';
      errorMessage.style.maxHeight = '300px';
      errorMessage.style.overflow = 'auto';
      errorMessage.textContent = msg;
      // Switch back to show error properly
      terminalView.classList.add('hidden');
      welcomeView.classList.remove('hidden');
    }
  }

  // Update modal elements
  const updateMask = document.getElementById('update-mask') as HTMLDivElement;
  const updateVersion = document.getElementById('update-version') as HTMLParagraphElement;
  const updateChangelog = document.getElementById('update-changelog') as HTMLParagraphElement;
  const btnUpdateLater = document.getElementById('btn-update-later') as HTMLButtonElement;
  const btnUpdateNow = document.getElementById('btn-update-now') as HTMLButtonElement;
  let pendingDownloadUrl = '';

  btnUpdateLater.addEventListener('click', () => { updateMask.classList.add('hidden'); });
  btnUpdateNow.addEventListener('click', () => {
    if (pendingDownloadUrl) window.folderAssistant.openDownloadUrl(pendingDownloadUrl);
    updateMask.classList.add('hidden');
  });
  updateMask.addEventListener('click', (e) => { if (e.target === updateMask) updateMask.classList.add('hidden'); });

  function showUpdateModal(info: { currentVersion: string; latestVersion?: string; changelog?: string; downloadUrl?: string }): void {
    updateVersion.textContent = `${info.currentVersion} → ${info.latestVersion}`;
    updateChangelog.textContent = info.changelog || '';
    pendingDownloadUrl = info.downloadUrl || '';
    updateMask.classList.remove('hidden');
  }

  async function checkUpdates(): Promise<void> {
    try {
      const info = await window.folderAssistant.checkForUpdates();
      if (info.hasUpdate) showUpdateModal(info);
    } catch {
      // silently ignore
    }
  }

  window.addEventListener('focus', () => {
    if (terminalManager) terminalManager.focus();
  });

  terminalContainer.addEventListener('click', () => {
    if (terminalManager) terminalManager.focus();
  });
}

document.addEventListener('DOMContentLoaded', init);
