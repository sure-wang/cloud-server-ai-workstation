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

## 典型工作流

1. 选择服务器上的一个本地目录
2. 先执行 `--dry-run` 预览
3. 让脚本自动创建或复用远端文件夹层级
4. 创建或更新飞书 / Lark 在线文档
5. 接收简短同步结果通知

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

## 当前限制

- 状态是按本地绝对路径建索引的，所以本地移动/重命名会被当作新的远端文档
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
