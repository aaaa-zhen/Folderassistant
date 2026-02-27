const path = require('path');
const fs = require('fs');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const realSrc = fs.realpathSync(srcPath);
    if (fs.statSync(realSrc).isDirectory()) {
      copyDirSync(realSrc, destPath);
    } else {
      fs.copyFileSync(realSrc, destPath);
    }
  }
}

module.exports = {
  packagerConfig: {
    asar: false,
    icon: path.resolve(__dirname, 'assets', 'icon'),
    name: 'Folder Assistant',
  },
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      // Copy node-pty native module to both locations:
      // 1. app/node_modules/ — for normal require resolution
      // 2. app/.webpack/main/node_modules/ — where webpack externals actually look
      const ptySrc = path.resolve(__dirname, 'node_modules', 'node-pty');

      const ptyDest1 = path.join(buildPath, 'node_modules', 'node-pty');
      console.log(`[hook] Copying node-pty to ${ptyDest1}`);
      copyDirSync(ptySrc, ptyDest1);

      const ptyDest2 = path.join(buildPath, '.webpack', 'main', 'node_modules', 'node-pty');
      console.log(`[hook] Copying node-pty to ${ptyDest2}`);
      copyDirSync(ptySrc, ptyDest2);

      // Copy @anthropic-ai/claude-code so bundled CLI works
      const claudeSrc = path.resolve(__dirname, 'node_modules', '@anthropic-ai', 'claude-code');
      const claudeDest = path.join(buildPath, 'node_modules', '@anthropic-ai', 'claude-code');
      console.log(`[hook] Copying @anthropic-ai/claude-code to ${claudeDest}`);
      copyDirSync(claudeSrc, claudeDest);

      // Copy @img/sharp-* optional dependencies (needed by claude-code on each platform)
      const imgDir = path.resolve(__dirname, 'node_modules', '@img');
      const imgDest = path.join(buildPath, 'node_modules', '@img');
      if (fs.existsSync(imgDir)) {
        console.log(`[hook] Copying @img/* to ${imgDest}`);
        copyDirSync(imgDir, imgDest);
      }
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
