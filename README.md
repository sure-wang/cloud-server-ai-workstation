# Cloud Server AI Workstation

[中文说明](./README.zh-CN.md)

Public case repository for building a reusable AI/Agent-assisted development environment on cloud servers.

This repository is organized as a set of independent, reusable solution modules.

## Start Here

- Repository overview: `docs/overview.md`
- Current roadmap: `docs/roadmap.md`
- Screenshot publishing guidance: `docs/screenshot-guidelines.md`
- First complete solution: `solutions/file-sharing/`

## Current Status

This repository is intentionally starting small.

- First published module: `solutions/file-sharing`
- Current focus: practical, reproducible, public-safe solution examples
- Future direction: expand into a broader set of cloud-server AI/Agent environment patterns

## Solutions

- `solutions/file-sharing` — sync local cloud-server text files to real Feishu/Lark Drive folders and online docs, with message notifications.
- `solutions/web-access-routing` — publish local AI tools and admin panels through subdomain-first Caddy reverse proxy patterns.

## Why This Repository Exists

- Cloud-server AI/Agent workflows are useful, but often too tied to one machine to share cleanly.
- Rebuilding the same environment on another server is expensive if the setup only lives in ad hoc notes.
- Public examples are valuable, but only if they are stripped of secrets, local state, and operational identifiers.

This repository is meant to turn real working setups into reusable, public-safe case modules.

## Design Goals

- Keep each solution independently understandable and reusable.
- Prefer simple operational recovery on a fresh cloud server.
- Separate public-safe templates from machine-local secrets and state.
- Preserve enough documentation so future AI/Agent sessions do not need to rediscover the setup.

## Planned Expansion

This repository is intended to grow into a broader collection of cloud-server AI/Agent environment patterns, such as:

- reverse proxy and web access patterns
- remote coding and agent entrypoints
- chat-driven operations
- environment bootstrap and disaster recovery

## Public Safety

This repository intentionally excludes:

- real app secrets
- real access tokens
- real local state files
- machine-specific private configuration

Use the example configuration files as templates and create your own local copies.

## License

This repository is released under the [MIT License](./LICENSE).

## Repository Map

```text
docs/                         repository-level overview and guidelines
solutions/file-sharing/       sync server text files to Feishu/Lark docs
solutions/web-access-routing/ subdomain-first reverse proxy patterns for local web apps
```

## Language Notes

- English repository entry: `README.md`
- Chinese repository entry: `README.zh-CN.md`
- English file-sharing module entry: `solutions/file-sharing/README.md`
- Chinese file-sharing module entry: `solutions/file-sharing/README.zh-CN.md`
- English web-access-routing module entry: `solutions/web-access-routing/README.md`
- Chinese web-access-routing module entry: `solutions/web-access-routing/README.zh-CN.md`
- Screenshot publishing guidance: `docs/screenshot-guidelines.md`
