# File Sharing Solution

[English](./README.md)

这是一个“云服务器本地文本文件 -> 飞书 / Lark 真实云盘文件夹与在线文档”的单向同步方案。

## 一眼看懂

- 本地来源：云服务器目录
- 远端目标：飞书 / Lark 真实 Drive 文件夹 + 在线 docx 文档
- 支持文件：`.md`、`.txt`
- 通知方式：使用当前授权用户发送简短 IM 提醒
- 安全策略：单向同步，正常流程下不会自动删除远端内容

## 它解决什么问题

- 把云服务器上多个来源目录里的 `.md` / `.txt` 文件同步到飞书 / Lark 在线文档
- 在云端保留一份用于新机器恢复的 manifest 文件
- 在远端云盘中保留本地绝对路径层级
- 对同步和重要操作发送简短 IM 通知
- 把这类工作流固化下来，方便未来 AI / Agent 会话复用

## 当前范围

- 支持文件类型：`.md`、`.txt`
- 单向同步：本地 -> 飞书 / Lark
- 一个本地文件对应一个在线文档
- 自动创建真实 Drive 文件夹层级
- 已存在的在线文档会用 overwrite 模式更新
- 正式同步后会在远端根目录上传 `.cloud_server_sync_manifest.json`

## 反向恢复流程

云端到本地的能力应该作为独立的恢复流程处理，而不是完整双向同步。

预期用途是从已经同步到飞书 / Lark 的在线文档恢复或迁移到指定的本地恢复目录。`scripts/feishu_restore.js` 可以使用本地 `/root/.local/share/opencode/cloud_server_sync/state.json`，也可以按 file token 下载云端 `.cloud_server_sync_manifest.json`，再通过 `lark-cli drive +export` 导出已知 docx 文档，并在 dry-run 检查后写入明确指定的 restore root。

恢复流程默认不应该覆盖原始 source 路径、不删除本地文件，也不自动解决本地编辑与云端文档编辑之间的冲突。由于恢复是把飞书 / Lark 在线文档导出为 Markdown，恢复文件不一定和原始文件字节级一致；manifest 包含 checksum 时，恢复脚本会报告校验匹配和不匹配数量。

## 典型工作流

1. 选择服务器上的一个本地目录
2. 先执行 `--dry-run` 预览
3. 让脚本自动创建或复用远端文件夹层级
4. 创建或更新飞书 / Lark 在线文档
5. 接收简短同步结果通知

## 非目标

- 任意二进制文件镜像
- 完整双向同步
- 本地编辑与云端文档编辑之间的自动冲突解决
- 本地重命名自动追踪
- 本地删除后自动删除远端文档

## 快速开始

1. 安装并配置 `lark-cli`
2. 创建 `/root/.config/opencode/cloud_server_sync/config.json`
3. 把 `CHANGE_ME_SERVER_NAME` 替换成这台服务器稳定使用的远端根目录名，例如 `cloud_server_aly` 或 `cloud_server_jp`
4. 对指定来源目录先执行 dry-run：

```bash
node scripts/feishu_sync.js --dry-run --source /absolute/path/to/local/source
```

5. 再执行正式同步：

```bash
node scripts/feishu_sync.js --source /absolute/path/to/local/source
```

运行时文件默认位于 OpenCode 全局目录：

- `/root/.config/opencode/cloud_server_sync/config.json`
- `/root/.local/share/opencode/cloud_server_sync/state.json`
- `/root/.local/share/opencode/cloud_server_sync/manifest.json`

## Agent 安全快速开始

这个模块既面向人类直接操作，也面向 AI Agent 通过内置 skill 模板复用。

为 OpenCode 安装 skill 模板：

```bash
npx -y skills add ./skills/cloud_server_sync -g --agent opencode --copy -y
```

安装新 skill 后，需要重启当前 OpenCode 服务或会话，让运行时重新加载 skill 列表。如果使用 systemd 部署，可以执行：

```bash
systemctl restart opencode.service
```

推荐 Agent 流程：

1. 读取 `/root/.config/opencode/cloud_server_sync/config.json`
2. 与人类操作者确认 `--source` 和 `remoteRootPath`
3. 执行 `node /root/.agents/skills/cloud_server_sync/scripts/feishu_sync.js --dry-run --source <path>`
4. 检查远端根目录和远端路径预览
5. 新源目录首次正式同步前，必须等到明确确认

## 适合的场景

- 云服务器上的笔记和运维文档
- 部署检查清单
- runbook / 故障排查记录
- 需要跨设备访问的服务器文本知识库

## 不适合的场景

- 二进制资源库
- 大型媒体归档
- 需要字节级文件镜像的场景
- 本地删除后要求自动删除远端的工作流

## 目录结构

- `scripts/`：同步与通知脚本
- `config/`：公开安全的配置模板
- `docs/`：安装、使用、权限、排障文档
- `skills/`：可复用、可安装的 AI 工具 skill 模板
- `examples/`：公开安全的状态示例

## 关键行为

所有绝对本地路径都会在配置的远端根目录下，按相对 `/` 的层级保留。

例如：

- `/workspace/example-docs` -> `cloud_server_aly/workspace/example-docs`
- `/srv/demo/content` -> `cloud_server_jp/srv/demo/content`
- `/srv/demo/config-snippets` -> `cloud_server_jp/srv/demo/config-snippets`

## 安全提醒

- 不要提交真实的运行时配置和状态文件
- 运行时 state 和 manifest 缓存应位于 `/root/.local/share/opencode/cloud_server_sync`
- 不要在 `remoteRootPath` 仍然是 `CHANGE_ME_SERVER_NAME` 或示例值时执行正式同步
- 对系统敏感目录执行正式同步前，先做一次 `--dry-run` 检查
- 默认会拒绝 broad source roots；只有明确审核后才使用 `--allow-dangerous-source`
- 同一个远端根目录下出现多个云端 manifest 会直接报错
- 如果你要公开日志、截图或通知消息，请打码本地路径、doc ID、folder token 等运行期元数据

## 当前限制

- 状态是按本地绝对路径建索引的，所以本地移动/重命名会被当作新的远端文档
- 云端到本地恢复是独立的恢复流程，而不是当前启用的双向同步
- 通过文档导出的恢复可能改变 Markdown 格式；只有明确需要时才使用 `--normalize-export` 做保守清理
- 远端残留清理是单独的手动操作，不在默认同步流程里
- 当前公开版本只处理偏文本型文件

## 推荐继续阅读

- `docs/setup.md`
- `docs/architecture.md`
- `docs/usage.md`
- `docs/permissions.md`
- `docs/troubleshooting.md`
- `../../docs/screenshot-guidelines.md`

## 语言说明

- 英文模块入口：`README.md`
- 中文模块入口：`README.zh-CN.md`
