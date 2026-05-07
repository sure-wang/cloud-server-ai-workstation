# Web Access Routing Solution

[中文说明](./README.zh-CN.md)

Public-safe reverse proxy patterns for exposing AI tools and admin panels on a cloud server.

## At a Glance

- Reverse proxy: `Caddy`
- Primary pattern: one subdomain per app
- Compatibility fallback: keep selected legacy path entries during migration
- Security hardening: restrict upstream admin ports to localhost when possible
- Target use cases: browser-based AI tools, admin panels, internal helper services

## What It Solves

- Publish multiple local services behind one public domain with HTTPS.
- Avoid frontend breakage caused by path-based mounting of root-path web apps.
- Keep migration steps reproducible when moving from `/tool/` URLs to subdomains.
- Reduce accidental public exposure of upstream admin ports.

## Current Scope

- `Caddy` reverse proxy examples
- subdomain-first routing strategy
- migration notes for path-based legacy entries
- localhost-only protection for upstream admin ports using a small systemd firewall guard
- Lucky-oriented notes for DDNS-managed subdomains and internal safe URL behavior

## Typical Workflow

1. Pick one subdomain per app.
2. Point DNS records to the cloud server public IP.
3. Route each app through `Caddy`.
4. Keep old path routes temporarily if users already rely on them.
5. Block direct public access to upstream admin ports if the app cannot bind to localhost by itself.

## Key Lessons From A Real Workstation

- Some apps are safe behind a subpath, but many modern SPAs are not.
- If an app serves assets from absolute root paths like `/assets/...`, prefer a dedicated subdomain.
- If an app has an internal safe/base URL, respect that behavior instead of forcing a clean root path.
- Public HTTPS entry should usually be `443` only; backend admin ports should stay local.
- Lucky can work well in a hybrid state: keep a legacy path entry for compatibility while introducing a cleaner subdomain entry.

## Good Fit

- OpenCode-like browser tools
- Lucky-like admin panels
- small internal helper APIs
- mixed environments where some tools are legacy and some are newly published

## Not a Good Fit

- setups that require heavy layer-7 auth logic beyond a simple reverse proxy
- apps that need product-specific ingress controllers or service meshes
- environments where the public DNS layer is externally managed in a way you cannot change

## Directory Layout

- `docs/architecture.md` — routing design and migration rationale
- `docs/setup.md` — DNS, Caddy, and port-guard setup steps
- `docs/todo.md` — deferred follow-up work for additional routed services
- `docs/troubleshooting.md` — common breakage patterns and checks
- `examples/Caddyfile.example` — public-safe reverse proxy example
- `examples/lucky-port-guard.service.example` — localhost-only port restriction example

## Safety Notes

- Do not publish real domains, server IPs, panel passwords, API keys, or DNS provider secrets.
- Replace real service names with generic placeholders before sharing screenshots or configs.
- Keep publicly committed examples domain-agnostic and copyable onto a fresh server.

## Read Next

- `docs/architecture.md`
- `docs/setup.md`
- `docs/todo.md`
- `docs/troubleshooting.md`
- `../../docs/screenshot-guidelines.md`

## Language Notes

- English module entry: `README.md`
- Chinese module entry: `README.zh-CN.md`
