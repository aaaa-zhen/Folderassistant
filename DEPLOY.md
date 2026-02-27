# 文件夹助手 — 发版与部署指南

## 服务器信息

| 项目 | 值 |
|------|-----|
| IP | `43.134.52.155` |
| 用户 | `root` |
| 密码 | `3Lq9#/T[s_dz` |
| 服务端口 | `3000`（复用 claude-assistant 的 Express 服务） |
| 版本接口 | `http://43.134.52.155:3000/api/folder-assistant/version` |
| 下载目录 | `/root/pi-mono/apk/folder-assistant/downloads/` |
| 版本文件 | `/root/pi-mono/apk/folder-assistant/version.json` |

## GitHub 仓库

| 项目 | 值 |
|------|-----|
| 仓库 | `https://github.com/aaaa-zhen/Folderassistant` |
| CI | GitHub Actions（push to main 自动触发） |
| Secret | `SERVER_PASSWORD` = 服务器密码（已配置） |

## 自动发版流程

```
1. 修改 package.json 里的 version（如 "1.0.0" → "1.1.0"）
2. git commit & push to main
3. GitHub Actions 自动：
   ├── 编译 Windows (win32) 和 macOS (darwin) 包
   ├── SCP 上传 zip 到服务器 /root/pi-mono/apk/folder-assistant/downloads/
   └── 更新服务器 version.json（versionCode 根据版本号自动计算）
4. 用户打开 app → 自动检查更新 → 弹窗提示下载
```

## 版本号规则

- `package.json` 的 `version` 字段：`"major.minor.patch"`
- `versionCode` 自动计算：`major * 10000 + minor * 100 + patch`
- 示例：`"1.2.3"` → versionCode = `10203`
- **每次发版必须递增版本号**，否则不会触发更新提示

## version.json 格式

```json
{
  "versionCode": 10100,
  "versionName": "1.1.0",
  "changelog": "更新日志（取 commit message 第一行）",
  "downloads": {
    "win32": "http://43.134.52.155:3000/fa-downloads/FolderAssistant-win32.zip",
    "darwin": "http://43.134.52.155:3000/fa-downloads/FolderAssistant-darwin.zip"
  }
}
```

## 手动发版

如果 CI 失败需要手动操作：

### 1. 本地打包

```bash
# macOS
npm install
npx electron-forge make

# 产物在 out/make/ 目录下
```

### 2. 上传到服务器

```bash
# macOS 包
sshpass -p '3Lq9#/T[s_dz' scp -o StrictHostKeyChecking=no \
  FolderAssistant-darwin.zip \
  root@43.134.52.155:/root/pi-mono/apk/folder-assistant/downloads/

# Windows 包
sshpass -p '3Lq9#/T[s_dz' scp -o StrictHostKeyChecking=no \
  FolderAssistant-win32.zip \
  root@43.134.52.155:/root/pi-mono/apk/folder-assistant/downloads/
```

### 3. 更新 version.json

```bash
sshpass -p '3Lq9#/T[s_dz' ssh -o StrictHostKeyChecking=no root@43.134.52.155 \
  "cat > /root/pi-mono/apk/folder-assistant/version.json << 'EOF'
{
  \"versionCode\": 10100,
  \"versionName\": \"1.1.0\",
  \"changelog\": \"你的更新日志\",
  \"downloads\": {
    \"win32\": \"http://43.134.52.155:3000/fa-downloads/FolderAssistant-win32.zip\",
    \"darwin\": \"http://43.134.52.155:3000/fa-downloads/FolderAssistant-darwin.zip\"
  }
}
EOF"
```

### 4. 验证

```bash
curl http://43.134.52.155:3000/api/folder-assistant/version
```

## 服务器架构

更新服务挂在 `/opt/claude-assistant/server.js`（Express，端口 3000）上：

- `GET /api/folder-assistant/version` → 读取 version.json 返回
- `GET /fa-downloads/*` → 静态文件服务，提供 zip 下载

进程管理：该 server.js 不在 pm2 里，是直接 `node server.js` 运行的（pid 可通过 `ss -tlnp | grep 3000` 查看）。

## 用户侧更新流程

```
打开 App → 自动检查更新（2秒后后台检查）
  → 已是最新版本：无提示
  → 有新版本：弹出更新弹窗（版本号 + 更新日志）
    → 点击「立即更新」→ 打开浏览器下载 zip
    → 点击「稍后」→ 关闭弹窗

也可以：设置 ⚙️ → 检查更新（手动触发）
```
