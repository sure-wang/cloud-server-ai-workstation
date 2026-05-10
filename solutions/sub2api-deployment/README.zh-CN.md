# Sub2API 部署方案

[English](./README.md)

这是一个面向“在新云服务器上恢复 `sub2api` 服务”的公开安全部署方案。

## 一眼看懂

- 应用：`sub2api`
- 部署方式：`Docker Compose`
- 目标主机：轻量云服务器 / 低成本 VPS
- 当前平台假设：具备 SSH、Docker Engine 和 Docker Compose 的 Linux 云服务器；该模式已在 Ubuntu 与 Alibaba Cloud Linux 上跑通
- 恢复思路：把每台服务器都当成可重建的临时宿主
- 后续衔接：当你要绑定域名并启用 HTTPS 时，再接到 `../web-access-routing/`

## 它解决什么问题

- 在一台新的云服务器上重新部署 `sub2api`，而不是依赖一次性的命令历史
- 把部署步骤整理成未来 AI / Agent 会话也能直接复用的材料
- 给低内存机器补上最基本的保护性配置，降低运行时炸掉的概率
- 把“服务恢复”和“公网 HTTPS 入口”拆成两个清晰的阶段

## 当前范围

- 首次 SSH 登录与后续密钥登录的前置假设
- Docker Engine 与 Compose 安装
- 小内存服务器适用的 swap 和内核参数
- `sub2api` 的 Docker Compose 部署
- 健康检查与管理员初始密码处理

## 非目标

- 完整的域名绑定和 HTTPS 终止配置
- 云厂商特定的 DNS 控制台教学
- 超出公开安全默认值之外的产品级安全加固
- `sub2api` 内部的业务计费、账号体系、实际渠道配置

## 典型工作流

1. 从一台可 SSH 登录的新服务器开始
2. 安装 Docker 与 Docker Compose
3. 如果机器规格较小，先补低内存保护配置
4. 克隆上游 `sub2api` 仓库
5. 生成部署文件，并设置一个临时管理员密码
6. 启动服务并验证 `/health`
7. 只有当本机健康状态稳定后，再继续接入 `../web-access-routing/` 做域名和 HTTPS

## 适合的场景

- 需要可恢复的 AI 辅助服务
- 新云服务器环境重建
- 低维护成本的小型内部 API 服务
- 希望把“部署”和“公网入口”松耦合的工作流

## 不适合的场景

- 必须走 Kubernetes 原生模式的环境
- 从第一天就要求完全由 Terraform / Ansible 接管的体系
- 连临时 HTTP 暴露都不允许的强约束环境

## 目录结构

- `docs/architecture.md`：部署边界与恢复模型
- `docs/setup.md`：逐步 bootstrap 与部署流程
- `docs/troubleshooting.md`：常见问题与检查方法
- `examples/env.override.example`：生成后可按需覆盖的公开安全示例值

## 安全提醒

- 不要提交真实 `.env`、管理员密码、JWT secret 或数据库密码
- 不要公开真实服务器 IP、SSH 别名或带实例标识的控制台截图
- 对外示例中请统一使用占位域名和占位邮箱

## 推荐继续阅读

- `docs/architecture.md`
- `docs/setup.md`
- `docs/troubleshooting.md`
- `../web-access-routing/README.md`
- `../../docs/screenshot-guidelines.md`

## 语言说明

- 英文模块入口：`README.md`
- 中文模块入口：`README.zh-CN.md`
