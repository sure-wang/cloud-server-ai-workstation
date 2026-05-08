# Cloud Server AI Workstation

[English](./README.md)

这是一个面向“云服务器 AI / Agent 辅助开发环境搭建”的公开案例仓库，用来沉淀可复用、可恢复、可分享的工作流方案。

## 从这里开始

- 仓库概览：`docs/overview.md`
- 当前路线图：`docs/roadmap.md`
- 截图发布规范：`docs/screenshot-guidelines.md`
- 第一个完整方案：`solutions/file-sharing/`

## 当前状态

这个仓库目前是有意识地从小做起：

- 已发布的第一个模块：`solutions/file-sharing`
- 新增的服务部署模块：`solutions/sub2api-deployment`
- 当前重点：实用、可恢复、可公开分享的方案样例
- 后续方向：逐步扩展成一组云服务器 AI / Agent 环境模式案例

## 方案模块

- `solutions/file-sharing`：将云服务器上的本地文本文件同步到飞书 / Lark 云盘与在线文档，并支持简短消息通知。
- `solutions/sub2api-deployment`：在一台新的云服务器上用 Docker Compose 部署 `sub2api`，并包含低内存机器的保护性配置与恢复说明。
- `solutions/web-access-routing`：通过以子域名优先的 Caddy 反向代理模式，对外发布本地 AI 工具和管理面板。

## 为什么要做这个仓库

- 云服务器上的 AI / Agent 工作流很有价值，但往往只适用于一台机器，很难直接分享。
- 如果搭建过程只存在于零散笔记里，换一台服务器恢复同样环境会非常低效。
- 公开案例只有在完成脱敏、去状态化和文档化后，才真正具有复用价值。

这个仓库的目标，就是把真实可用的工作环境整理成可以公开分享的方案模块。

## 设计目标

- 每个方案模块都能独立理解、独立复用。
- 尽量让一台新的云服务器也能快速恢复同样的工作环境。
- 公开仓库中只保留可分享内容，不提交本机私密配置与状态。
- 通过文档和 skill 固化上下文，减少未来 AI / Agent 会话重复探索。

## 规划方向

后续这个仓库会继续扩展更多云服务器 AI / Agent 环境模式，例如：

- 反向代理与 Web 访问方案
- 远程编码与 Agent 入口方案
- 聊天驱动运维 / 自动化操作
- 环境初始化与灾难恢复

## 公开安全原则

仓库不会提交以下内容：

- 真实 app secret
- 真实 access token
- 真实本地状态文件
- 机器私有配置

请基于示例配置自行创建本地副本。

## License

本仓库采用 [MIT License](./LICENSE)。

## 仓库结构概览

```text
docs/                         仓库级说明和公开发布规范
solutions/file-sharing/       服务器文本同步到飞书 / Lark 文档
solutions/sub2api-deployment/ 在新云服务器上恢复 sub2api 服务
solutions/web-access-routing/ 本地 Web 应用的子域名优先反向代理模式
```

## 语言说明

- 英文仓库入口：`README.md`
- 中文仓库入口：`README.zh-CN.md`
- 英文 file-sharing 入口：`solutions/file-sharing/README.md`
- 中文 file-sharing 入口：`solutions/file-sharing/README.zh-CN.md`
- 英文 sub2api deployment 入口：`solutions/sub2api-deployment/README.md`
- 中文 sub2api deployment 入口：`solutions/sub2api-deployment/README.zh-CN.md`
- 英文 web-access-routing 入口：`solutions/web-access-routing/README.md`
- 中文 web-access-routing 入口：`solutions/web-access-routing/README.zh-CN.md`
- 截图发布规范：`docs/screenshot-guidelines.md`
