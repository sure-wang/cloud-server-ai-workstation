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
6. After live sync, the script uploads `.cloud_server_sync_manifest.json` to the remote root as a normal Drive file for fresh-machine recovery.
7. Do not point `source` at broad system directories such as `/`, `/root`, `/etc`, or `/var` unless the user explicitly confirms that exact path.
8. If a demo or test run created the wrong remote root, ask before deleting or renaming existing Drive content.
9. If this skill was just installed and is not visible to the agent, tell the human to restart the active OpenCode service or session so the skill list is reloaded.

## Restore Workflow Guidance

Remote-to-local restore is a recovery workflow, not active bidirectional sync.

When the user asks about restoring cloud docs to local files:

1. Explain that normal sync only runs local -> Feishu/Lark.
2. Use `node scripts/feishu_restore.js --dry-run --restore-root <path>` for preview.
3. On a fresh machine without `data/state.json`, ask for the cloud manifest file token or the remote root folder URL/token.
4. Preview with `node scripts/feishu_restore.js --dry-run --manifest-file-token <file_token> --restore-root <path>` or `node scripts/feishu_restore.js --dry-run --manifest-folder-token <folder_url_or_token> --restore-root <path>`.
5. Require an explicit restore root from the user.
6. Do not restore directly into `/`, `/root`, `/etc`, `/var`, or the original source path unless the user explicitly confirms that exact target.
7. Do not overwrite existing local files or delete local files by default.
8. Use `--execute` only after the user reviews the dry-run output.
9. Use `--overwrite` only when the user explicitly asks to replace existing local files.

## Remote Path Rule

All absolute local paths are preserved relative to `/` under the configured remote root.

Examples:

- `/workspace/example-docs` -> `cloud_server_aly/workspace/example-docs`
- `/srv/demo/config-snippets` -> `cloud_server_jp/srv/demo/config-snippets`

## Important Notes

- The script auto-creates missing remote folders
- Sync is one-way: local -> Feishu/Lark
- Remote -> local is a separate restore workflow, not bidirectional sync
- Fresh-machine restore can use the `.cloud_server_sync_manifest.json` file token or a remote root folder URL/token containing that manifest
- Important manual operations should send a short notification using `node scripts/lark_notify.js --text "..."`
- Use `--dry-run` before first syncing any sensitive or system directory
- Live sync is blocked while `remoteRootPath` still contains `CHANGE_ME_SERVER_NAME` or `example_server_sync`.
