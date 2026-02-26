import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

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

  // 2. Try require.resolve at runtime
  try {
    const resolved = require.resolve('@anthropic-ai/claude-code/cli.js');
    if (resolved && fs.existsSync(resolved)) {
      debug.push('require.resolve found: ' + resolved);
      writeDebug(debug);
      return { found: true, mode: 'bundled', claudePath: resolved, error: null };
    }
  } catch {
    debug.push('require.resolve failed');
  }

  // 3. Brute force search from cwd
  const cwd = process.cwd();
  debug.push('cwd: ' + cwd);

  const roots = [cwd, path.resolve(cwd, '..'), path.resolve(cwd, '..', '..')];
  for (const root of roots) {
    const candidate = path.join(root, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');
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
