---
name: cloud_server_sync
description: Sync local cloud-server text files to Feishu/Lark Drive folders and online docs.
alwaysActive: false
---

# Cloud Server Sync

Use this skill when the user wants to sync local server text files to Feishu/Lark.

## Assumptions

- The environment already has `lark-cli` installed and configured
- User authorization has been completed
- `config/config.json` exists for this solution

## Default Command

```bash
node scripts/feishu_sync.js
```

## Remote Path Rule

All absolute local paths are preserved relative to `/` under the configured remote root.

Examples:

- `/workspace/example-docs` -> `example_server_sync/workspace/example-docs`
- `/srv/demo/config-snippets` -> `example_server_sync/srv/demo/config-snippets`

## Important Notes

- The script auto-creates missing remote folders
- Sync is one-way: local -> Feishu/Lark
- Important manual operations should send a short notification using `node scripts/lark_notify.js --text "..."`
- Use `--dry-run` before first syncing any sensitive or system directory
