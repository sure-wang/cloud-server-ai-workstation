# Cloud Server AI Workstation

[中文说明](./README.zh-CN.md)

Public case repository for building a reusable AI/Agent-assisted development environment on cloud servers.

This repository is organized as a set of independent, reusable solution modules.

## Solutions

- `solutions/file-sharing` — sync local cloud-server text files to real Feishu/Lark Drive folders and online docs, with message notifications.

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

## Language Notes

- English repository entry: `README.md`
- Chinese repository entry: `README.zh-CN.md`
- English file-sharing module entry: `solutions/file-sharing/README.md`
- Chinese file-sharing module entry: `solutions/file-sharing/README.zh-CN.md`
- Screenshot publishing guidance: `docs/screenshot-guidelines.md`
