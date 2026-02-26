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
      // Copy node-pty native module
      const ptySrc = path.resolve(__dirname, 'node_modules', 'node-pty');
      const ptyDest = path.join(buildPath, 'node_modules', 'node-pty');
      console.log(`[hook] Copying node-pty to ${ptyDest}`);
      copyDirSync(ptySrc, ptyDest);

      // Copy @anthropic-ai/claude-code so bundled CLI works
      const claudeSrc = path.resolve(__dirname, 'node_modules', '@anthropic-ai', 'claude-code');
      const claudeDest = path.join(buildPath, 'node_modules', '@anthropic-ai', 'claude-code');
      console.log(`[hook] Copying @anthropic-ai/claude-code to ${claudeDest}`);
      copyDirSync(claudeSrc, claudeDest);
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'FolderAssistant',
        authors: 'aaaa-zhen',
        description: 'Launch Claude Code in any folder with a visual terminal',
      },
    },
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
