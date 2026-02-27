const path = require('path');
const fs = require('fs');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    let realSrc;
    try {
      realSrc = fs.realpathSync(srcPath);
    } catch {
      continue; // skip broken symlinks
    }
    if (fs.statSync(realSrc).isDirectory()) {
      copyDirSync(realSrc, destPath);
    } else {
      fs.copyFileSync(realSrc, destPath);
    }
  }
}

function findAppDir(outputPaths) {
  // outputPaths is an array of output directories from electron-packager
  for (const p of outputPaths) {
    // macOS: look for .app/Contents/Resources/app
    const macApp = path.join(p, fs.readdirSync(p).find(f => f.endsWith('.app')) || '', 'Contents', 'Resources', 'app');
    if (fs.existsSync(macApp)) return macApp;
    // Windows/Linux: resources/app
    const winApp = path.join(p, 'resources', 'app');
    if (fs.existsSync(winApp)) return winApp;
  }
  return null;
}

module.exports = {
  packagerConfig: {
    asar: false,
    icon: path.resolve(__dirname, 'assets', 'icon'),
    name: 'FolderAssistant',
  },
  hooks: {
    postPackage: async (_config, result) => {
      const appDir = findAppDir(result.outputPaths);
      if (!appDir) {
        console.error('[hook] Could not find app directory in output!');
        return;
      }
      console.log(`[hook] App directory: ${appDir}`);

      // Copy node-pty to .webpack/main/node_modules/ (where webpack externals resolve)
      const ptySrc = path.resolve(__dirname, 'node_modules', 'node-pty');
      const ptyDest = path.join(appDir, '.webpack', 'main', 'node_modules', 'node-pty');
      console.log(`[hook] Copying node-pty to ${ptyDest}`);
      copyDirSync(ptySrc, ptyDest);

      // Also copy to app/node_modules for general require resolution
      const ptyDest2 = path.join(appDir, 'node_modules', 'node-pty');
      if (!fs.existsSync(ptyDest2)) {
        console.log(`[hook] Copying node-pty to ${ptyDest2}`);
        copyDirSync(ptySrc, ptyDest2);
      }

      // Copy @anthropic-ai/claude-code for bundled CLI
      const claudeSrc = path.resolve(__dirname, 'node_modules', '@anthropic-ai', 'claude-code');
      const claudeDest = path.join(appDir, 'node_modules', '@anthropic-ai', 'claude-code');
      if (!fs.existsSync(claudeDest)) {
        console.log(`[hook] Copying @anthropic-ai/claude-code to ${claudeDest}`);
        copyDirSync(claudeSrc, claudeDest);
      }

      // Copy @img/sharp-* optional dependencies
      const imgDir = path.resolve(__dirname, 'node_modules', '@img');
      const imgDest = path.join(appDir, 'node_modules', '@img');
      if (fs.existsSync(imgDir) && !fs.existsSync(imgDest)) {
        console.log(`[hook] Copying @img/* to ${imgDest}`);
        copyDirSync(imgDir, imgDest);
      }

      console.log('[hook] All native modules copied successfully');
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        devServer: {
          hot: true,
          liveReload: false,
        },
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/renderer/index.html',
              js: './src/renderer/renderer.ts',
              name: 'main_window',
              preload: {
                js: './src/preload/preload.ts',
              },
            },
          ],
        },
      },
    },
  ],
};
