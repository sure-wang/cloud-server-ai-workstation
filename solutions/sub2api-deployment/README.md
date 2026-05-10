# Sub2API Deployment Solution

[中文说明](./README.zh-CN.md)

Public-safe deployment notes for restoring `sub2api` on a fresh cloud server.

## At a Glance

- App: `sub2api`
- Deployment style: `Docker Compose`
- Target host type: low-cost cloud servers and lightweight VPS instances
- Current platform assumption: Linux cloud server with SSH, Docker Engine, and Docker Compose; this pattern has been run on Ubuntu and Alibaba Cloud Linux
- Recovery posture: treat each server as rebuildable
- Follow-up path: pair this module with `../web-access-routing/` when you are ready to bind a domain and serve HTTPS

## What It Solves

- Rebuild `sub2api` on a new cloud server without relying on one-off shell history.
- Keep deployment steps understandable enough for future AI/Agent sessions to reuse.
- Add small low-memory guardrails that help lightweight servers survive normal operation.
- Separate service bootstrap from the later public-HTTPS routing layer.

## Current Scope

- SSH access assumptions for first login and key-based follow-up
- Docker Engine and Compose installation
- swap and kernel settings that are reasonable on small servers
- `sub2api` deployment with Docker Compose
- health checks and first-login admin credential handling

## Non-Goals

- full domain binding or HTTPS termination
- provider-specific DNS walkthroughs
- application-level hardening beyond public-safe deployment defaults
- product-specific billing, account, or business configuration inside `sub2api`

## Typical Workflow

1. Start from a fresh server with SSH access.
2. Install Docker and Docker Compose.
3. Add low-memory guardrails if the server is small.
4. Clone the upstream `sub2api` repository.
5. Generate deployment files and set a temporary admin password.
6. Start the stack and verify `/health`.
7. Only after local health is stable, continue with `../web-access-routing/` for domain and HTTPS exposure.

## Good Fit

- rebuildable AI helper services
- fresh cloud server recovery
- low-ceremony internal API services
- setups where deployment and public ingress should stay loosely coupled

## Not a Good Fit

- environments that require Kubernetes-native deployment patterns
- stacks that must be fully managed by Terraform or Ansible from day one
- situations where the service should never be reachable over HTTP, even temporarily

## Directory Layout

- `docs/architecture.md` - deployment boundaries and recovery model
- `docs/setup.md` - step-by-step bootstrap and deployment flow
- `docs/troubleshooting.md` - common breakage patterns and checks
- `docs/localhost-behind-caddy.md` - bind the app port to localhost after HTTPS routing is ready
- `examples/env.override.example` - public-safe values you may want to override after generation

## Safety Notes

- Do not commit real `.env` files, admin passwords, JWT secrets, or database passwords.
- Do not publish real server IPs, SSH aliases, or provider console screenshots with instance identifiers.
- Use placeholder domains and placeholder emails in public examples.

## Read Next

- `docs/architecture.md`
- `docs/setup.md`
- `docs/troubleshooting.md`
- `docs/localhost-behind-caddy.md`
- `../web-access-routing/README.md`
- `../../docs/screenshot-guidelines.md`

## Language Notes

- English module entry: `README.md`
- Chinese module entry: `README.zh-CN.md`
