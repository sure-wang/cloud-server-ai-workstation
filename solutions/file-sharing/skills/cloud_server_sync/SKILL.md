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
- The agent is running from `solutions/file-sharing` or uses that directory as the command working directory

## Default Command

```bash
node scripts/feishu_sync.js
```

## Agent-Safe Workflow

1. Read `config/config.json` before running sync.
2. Confirm `source` points to the intended local directory.
3. Confirm `remoteRootPath` has been changed from `CHANGE_ME_SERVER_NAME` to this server's stable folder name, for example `cloud_server_aly` or `cloud_server_jp`.
4. Always run `node scripts/feishu_sync.js --dry-run` before the first live sync for a new source.
5. Review the dry-run remote root and remote path preview with the user before live sync.
6. Do not point `source` at broad system directories such as `/`, `/root`, `/etc`, or `/var` unless the user explicitly confirms that exact path.
7. If a demo or test run created the wrong remote root, ask before deleting or renaming existing Drive content.
8. If this skill was just installed and is not visible to the agent, tell the human to restart the active OpenCode service or session so the skill list is reloaded.

## Restore Workflow Guidance

Remote-to-local restore is a planned recovery workflow, not active bidirectional sync.

When the user asks about restoring cloud docs to local files:

1. Explain that the current live script only syncs local -> Feishu/Lark.
2. Treat restore as dry-run/planning unless a restore script exists and the user explicitly requests execution.
3. Require an explicit restore root from the user.
4. Do not restore directly into `/`, `/root`, `/etc`, `/var`, or the original source path unless the user explicitly confirms that exact target.
5. Do not overwrite existing local files or delete local files by default.
6. Prefer exporting known docs from `data/state.json` with `lark-cli drive +export` in a future restore implementation.

## Remote Path Rule

All absolute local paths are preserved relative to `/` under the configured remote root.

Examples:

- `/workspace/example-docs` -> `cloud_server_aly/workspace/example-docs`
- `/srv/demo/config-snippets` -> `cloud_server_jp/srv/demo/config-snippets`

## Important Notes

- The script auto-creates missing remote folders
- Sync is one-way: local -> Feishu/Lark
- Remote -> local is planned as a separate restore workflow, not bidirectional sync
- Important manual operations should send a short notification using `node scripts/lark_notify.js --text "..."`
- Use `--dry-run` before first syncing any sensitive or system directory
- Live sync is blocked while `remoteRootPath` still contains `CHANGE_ME_SERVER_NAME` or `example_server_sync`.
