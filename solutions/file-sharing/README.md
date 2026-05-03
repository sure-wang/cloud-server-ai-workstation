# File Sharing Solution

[中文说明](./README.zh-CN.md)

One-way sync from local cloud-server text files to real Feishu/Lark Drive folders and online docs.

## What It Solves

- Keep selected server-side `.md` / `.txt` files available in Feishu/Lark online docs.
- Preserve local absolute path structure under a configurable remote root folder.
- Send short IM notifications for important operations and sync summaries.
- Make the workflow reusable across future AI/Agent sessions.

## Current Scope

- Supported file types: `.md`, `.txt`
- One-way sync only: local -> Feishu/Lark
- One online doc per local file
- Real Drive folders are auto-created as needed
- Existing docs are updated in place with overwrite mode

## Non-Goals

- arbitrary binary file mirroring
- full bidirectional sync
- rename tracking across local path changes
- remote automatic deletion when local files disappear

## Quick Start

1. Install and configure `lark-cli`
2. Copy `config/config.example.json` to `config/config.json`
3. Edit the source path and remote root folder path
4. Run a preview:

```bash
node scripts/feishu_sync.js --dry-run
```

5. Run the live sync:

```bash
node scripts/feishu_sync.js
```

## Directory Layout

- `scripts/` — sync and notification scripts
- `config/` — public-safe config template
- `docs/` — setup, usage, permissions, troubleshooting
- `skills/` — reusable skill template for AI tools
- `examples/` — public-safe example state

## Key Behavior

Absolute local paths are preserved relative to `/` under the configured remote root.

Examples:

- `/workspace/example-docs` -> `example_server_sync/workspace/example-docs`
- `/srv/demo/content` -> `example_server_sync/srv/demo/content`
- `/srv/demo/config-snippets` -> `example_server_sync/srv/demo/config-snippets`

## Safety Notes

- Do not commit real `config.json` or `data/state.json`
- Do not live-sync sensitive system directories before a `--dry-run` review
- If you share logs, screenshots, or notifications publicly, redact local paths, doc IDs, folder tokens, and other runtime metadata

## Read Next

- `docs/setup.md`
- `docs/architecture.md`
- `docs/usage.md`
- `docs/permissions.md`
- `docs/troubleshooting.md`
- `../../docs/screenshot-guidelines.md`

## Language Notes

- English module entry: `README.md`
- Chinese module entry: `README.zh-CN.md`
