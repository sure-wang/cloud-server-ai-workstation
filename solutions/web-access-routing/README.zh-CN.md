# Web Access Routing Solution

[English](./README.md)

这是一个面向云服务器上 AI 工具和管理面板的公开安全反向代理方案。

## 一眼看懂

- 反向代理：`Caddy`
- HTTPS/SSL：Caddy 自动 HTTPS + Let's Encrypt 免费证书
- 核心模式：一个应用一个子域名
- 兼容策略：迁移期间可临时保留旧的路径入口
- 安全加固：尽量把上游管理端口限制为仅本机可访问
- 适用对象：浏览器 AI 工具、管理面板、内部辅助服务
- 当前平台假设：具备 `systemd`、Caddy、Docker 和 SSH 访问的 Linux 云服务器；该模式已在 Ubuntu 与 Alibaba Cloud Linux 上跑通

## 它解决什么问题

- 在一个公网域名下，为多个本地服务提供 HTTPS Web 入口
- 避免把只能跑在根路径的前端应用硬挂在子路径后导致白屏或资源加载失败
- 固化从 `/tool/` 迁移到子域名的操作方式
- 降低后台管理端口被公网直接探测和访问的风险

## 当前范围

- `Caddy` 反向代理示例
- Caddy 自动申请证书，并自动完成 HTTP 到 HTTPS 跳转
- 子域名优先的路由策略
- 路径入口迁移与兼容保留
- 使用一个小型 systemd 防护服务限制后台端口仅本机访问
- Lucky 这类面板的 DDNS 多记录同步与 safe URL 行为说明
- 提供和 `sub2api` 这类已部署本地服务进行衔接的入口说明

## 典型工作流

1. 为每个应用分配一个子域名
2. 将 DNS 解析到云服务器公网 IP
3. 先确认目标应用已经在本机健康运行
4. 通过 `Caddy` 把子域名路由到本地服务
5. 如果已有用户依赖旧路径入口，则临时保留旧路径
6. 如果应用自身不能只监听本地，则额外阻断后台端口的公网直连

## 来自真实工作站的关键经验

- 有些应用可以挂在子路径后，但很多现代 SPA 并不适合
- 如果应用静态资源使用 `/assets/...` 这类绝对根路径，应优先给它独立子域名
- 如果应用内部自带 safe URL 或 base URL 行为，应顺着它的设计，而不是强行改成根路径
- 公网通常只需要暴露 `443`，后台管理端口尽量只保留本机访问
- Lucky 这类面板很适合采用“旧路径保留兼容 + 新子域名作为首选入口”的混合迁移方式

## 适合的场景

- 类似 OpenCode 的浏览器工具
- 类似 Lucky 的管理面板
- 小型内部 API
- 同时存在新旧访问方式的混合环境

## 不适合的场景

- 需要复杂七层鉴权逻辑的入口
- 必须依赖特定 ingress controller 或 service mesh 的系统
- DNS 完全由外部平台强控且无法修改的环境

## 目录结构

- [docs/architecture.md](./docs/architecture.md)：路由设计与迁移理由
- [docs/setup.md](./docs/setup.md)：DNS、Caddy、端口防护配置步骤
- [docs/opencode-lucky-sub2api.md](./docs/opencode-lucky-sub2api.md)：OpenCode、Lucky、sub2api 三服务的公开安全路由恢复模式
- [docs/todo.md](./docs/todo.md)：更多待接入服务的延后工作说明
- [docs/troubleshooting.md](./docs/troubleshooting.md)：常见问题与检查方法
- [examples/Caddyfile.example](./examples/Caddyfile.example)：公开安全的反向代理示例
- [examples/Caddyfile.opencode-lucky-sub2api.example](./examples/Caddyfile.opencode-lucky-sub2api.example)：OpenCode、Lucky、sub2api 子域名示例
- [examples/opencode.service.example](./examples/opencode.service.example)：OpenCode 仅本机监听的 systemd 服务示例
- [examples/lucky-port-guard.service.example](./examples/lucky-port-guard.service.example)：仅本机访问端口的示例服务

## 安全提醒

- 不要公开真实域名、服务器 IP、面板密码、API key 或 DNS 密钥
- 对外分享截图或配置前，请把真实服务名替换成通用占位符
- 仓库中只保留可复制、可恢复、与具体机器无关的公共示例

## 推荐继续阅读

- [../sub2api-deployment/README.md](../sub2api-deployment/README.md)
- [docs/architecture.md](./docs/architecture.md)
- [docs/setup.md](./docs/setup.md)
- [docs/opencode-lucky-sub2api.md](./docs/opencode-lucky-sub2api.md)
- [docs/todo.md](./docs/todo.md)
- [docs/troubleshooting.md](./docs/troubleshooting.md)
- [../../docs/screenshot-guidelines.md](../../docs/screenshot-guidelines.md)

## 语言说明

- 英文模块入口：[README.md](./README.md)
- 中文模块入口：[README.zh-CN.md](./README.zh-CN.md)
