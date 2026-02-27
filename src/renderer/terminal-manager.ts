import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';

declare global {
  interface Window {
    folderAssistant: {
      detectClaude: () => Promise<{ found: boolean; mode: string; claudePath: string | null; error: string | null }>;
      spawnPty: (folderPath: string) => Promise<{ pid: number }>;
      writePty: (data: string) => void;
      resizePty: (cols: number, rows: number) => void;
      killPty: () => void;
      onPtyData: (cb: (data: string) => void) => () => void;
      onPtyExit: (cb: (code: number) => void) => () => void;
      openFolderDialog: () => Promise<string | null>;
      loadSettings: () => Promise<{ apiKey: string; baseUrl: string; model: string; disableNonessentialTraffic: boolean }>;
      saveSettings: (s: any) => Promise<{ success: boolean }>;
      getModels: () => Promise<{ id: string; name: string }[]>;
    };
  }
}

export class TerminalManager {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private resizeObserver: ResizeObserver;
  private removeDataListener: (() => void) | null = null;
  private removeExitListener: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.terminal = new Terminal({
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", "Menlo", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        selectionBackground: '#33467c',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5',
      },
      allowProposedApi: true,
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.loadAddon(new WebLinksAddon());
    this.terminal.open(container);

    // WebGL renderer for GPU-accelerated rendering
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      this.terminal.loadAddon(webglAddon);
    } catch {
      // fallback to canvas renderer
    }

    this.fitAddon.fit();

    this.terminal.onData((data) => {
      window.folderAssistant.writePty(data);
    });

    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(container);
  }

  async start(folderPath: string): Promise<void> {
    await window.folderAssistant.spawnPty(folderPath);

    this.removeDataListener = window.folderAssistant.onPtyData((data) => {
      this.terminal.write(data);
    });

    this.removeExitListener = window.folderAssistant.onPtyExit((exitCode) => {
      this.terminal.writeln('');
      this.terminal.writeln(`\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`);
    });

    this.fit();
  }

  fit(): void {
    try {
      this.fitAddon.fit();
      const dims = this.fitAddon.proposeDimensions();
      if (dims) {
        window.folderAssistant.resizePty(dims.cols, dims.rows);
      }
    } catch {
      // ignore during init
    }
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.removeDataListener?.();
    this.removeExitListener?.();
    window.folderAssistant.killPty();
    this.terminal.dispose();
  }

  focus(): void {
    this.terminal.focus();
  }
}
