# File Sharing Solution

[English](./README.md)

这是一个“云服务器本地文本文件 -> 飞书 / Lark 真实云盘文件夹与在线文档”的单向同步方案。

## 它解决什么问题

- 把云服务器上的 `.md` / `.txt` 文件同步到飞书 / Lark 在线文档
- 在远端云盘中保留本地绝对路径层级
- 对同步和重要操作发送简短 IM 通知
- 把这类工作流固化下来，方便未来 AI / Agent 会话复用

## 当前范围

- 支持文件类型：`.md`、`.txt`
- 单向同步：本地 -> 飞书 / Lark
- 一个本地文件对应一个在线文档
- 自动创建真实 Drive 文件夹层级
- 已存在的在线文档会用 overwrite 模式更新

## 非目标

- 任意二进制文件镜像
- 完整双向同步
- 本地重命名自动追踪
- 本地删除后自动删除远端文档

## 快速开始

1. 安装并配置 `lark-cli`
2. 复制 `config/config.example.json` 为 `config/config.json`
3. 修改本地源目录和远端根目录配置
4. 先执行 dry-run：

```bash
node scripts/feishu_sync.js --dry-run
```

5. 再执行正式同步：

```bash
node scripts/feishu_sync.js
```

## 目录结构

- `scripts/`：同步与通知脚本
- `config/`：公开安全的配置模板
- `docs/`：安装、使用、权限、排障文档
- `skills/`：可复用的 AI 工具 skill 模板
- `examples/`：公开安全的状态示例

## 关键行为

所有绝对本地路径都会在配置的远端根目录下，按相对 `/` 的层级保留。

例如：

- `/workspace/example-docs` -> `example_server_sync/workspace/example-docs`
- `/srv/demo/content` -> `example_server_sync/srv/demo/content`
- `/srv/demo/config-snippets` -> `example_server_sync/srv/demo/config-snippets`

## 安全提醒

- 不要提交真实的 `config.json` 和 `data/state.json`
- 对系统敏感目录执行正式同步前，先做一次 `--dry-run` 检查
- 如果你要公开日志、截图或通知消息，请打码本地路径、doc ID、folder token 等运行期元数据

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
