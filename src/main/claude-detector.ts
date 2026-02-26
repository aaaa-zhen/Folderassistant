import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface ClaudeDetectionResult {
  found: boolean;
  mode: 'system' | 'bundled' | 'none';
  claudePath: string | null;
  error: string | null;
}

export function detectClaude(): ClaudeDetectionResult {
  const debug: string[] = [];

  // 1. Check system PATH
  try {
    const cmd = process.platform === 'win32' ? 'where claude' : 'which claude';
    const result = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (result) {
      debug.push('Found system claude: ' + result);
      writeDebug(debug);
      return { found: true, mode: 'system', claudePath: result.split('\n')[0], error: null };
    }
  } catch {
    debug.push('System claude not in PATH');
  }

  // 2. Search for bundled @anthropic-ai/claude-code in app resources
  const searchRoots = [
    // Packaged app: resources/app/node_modules
    path.resolve(app.getAppPath(), 'node_modules'),
    // Packaged app alternative: next to .webpack
    path.resolve(app.getAppPath(), '..', 'node_modules'),
    // Dev mode: project root
    path.resolve(__dirname, '..', '..', 'node_modules'),
    path.resolve(__dirname, '..', '..', '..', 'node_modules'),
    // cwd fallback
    path.resolve(process.cwd(), 'node_modules'),
  ];

  debug.push('app.getAppPath: ' + app.getAppPath());
  debug.push('__dirname: ' + __dirname);
  debug.push('cwd: ' + process.cwd());

  for (const nm of searchRoots) {
    const candidate = path.join(nm, '@anthropic-ai', 'claude-code', 'cli.js');
    const exists = fs.existsSync(candidate);
    debug.push(`${exists ? 'FOUND' : 'miss'}: ${candidate}`);
    if (exists) {
      writeDebug(debug);
      return { found: true, mode: 'bundled', claudePath: candidate, error: null };
    }
  }

  writeDebug(debug);
  return {
    found: false,
    mode: 'none',
    claudePath: null,
    error: 'Claude CLI not found and bundled package is missing.',
  };
}

function writeDebug(lines: string[]): void {
  try {
    fs.writeFileSync('/tmp/claude-detector-debug.log', lines.join('\n') + '\n');
  } catch {
    // ignore
  }
}
