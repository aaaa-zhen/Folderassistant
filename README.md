# Folder Assistant

一个可视化工具，让不会用终端的人也能轻松在任意文件夹中启动 **Claude Code**。

选择一个文件夹 → 自动打开内嵌终端 → Claude Code 就绪，开始对话。

## 功能

- 选择任意文件夹，一键启动 Claude Code
- 内嵌终端（xterm.js），无需手动打开系统终端
- API 密钥和模型设置，支持自定义 API 代理
- 系统托盘常驻，随时打开新文件夹
- 深色主题（Tokyo Night 风格）
- 跨平台：macOS / Windows

## 下载

前往 [GitHub Actions](https://github.com/aaaa-zhen/Folderassistant/actions) 页面，点击最新的构建，在底部 **Artifacts** 下载：

| 平台 | 文件 |
|------|------|
| macOS | `folder-assistant-darwin` |
| Windows | `folder-assistant-win32` |

### macOS 首次打开

由于没有 Apple 开发者签名，首次打开需要解除隔离限制：

```bash
sudo xattr -rd com.apple.quarantine '/path/to/Folder Assistant.app'
```

## 使用方法

1. 打开 Folder Assistant
2. 点击设置图标，填入你的 API 密钥，选择模型，保存
3. 点击输入栏或文件夹图标，选择一个文件夹
4. 终端自动启动 Claude Code，开始对话

## 从源码运行

```bash
# 安装依赖（国内推荐用 cnpm）
npm install

# 启动开发模式
npm start

# 打包
npm run make
```

## 技术栈

- **Electron** — 跨平台桌面应用
- **xterm.js** — 终端模拟器
- **node-pty** — 伪终端，连接 Claude CLI
- **Electron Forge + Webpack** — 构建打包
- **TypeScript**

## 项目结构

```
src/
├── main/
│   ├── main.ts              # 主进程入口
│   ├── ipc-handlers.ts      # IPC 通道：PTY 管理
│   ├── claude-detector.ts   # Claude CLI 检测
│   ├── settings.ts          # 设置持久化
│   ├── tray.ts              # 系统托盘
│   ├── windows.ts           # 窗口管理
│   └── context-menu-registry.ts  # Windows 右键菜单
├── preload/
│   └── preload.ts           # 安全 IPC 桥接
└── renderer/
    ├── index.html           # 界面
    ├── styles.css           # 样式
    ├── renderer.ts          # 渲染进程入口
    └── terminal-manager.ts  # xterm.js 封装
```

## License

MIT
