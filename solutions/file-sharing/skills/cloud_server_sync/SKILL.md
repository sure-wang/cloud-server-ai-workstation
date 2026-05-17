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
- Runtime config exists at `/root/.config/opencode/cloud_server_sync/config.json`
- Runtime state is stored at `/root/.local/share/opencode/cloud_server_sync/state.json`
- Local manifest cache is stored at `/root/.local/share/opencode/cloud_server_sync/manifest.json`
- Scripts are included in this skill under `scripts/` and can run from any working directory

## Default Commands

Preview a source directory:

```bash
node /root/.agents/skills/cloud_server_sync/scripts/feishu_sync.js --dry-run --source <path>
```

Run live sync after review:

```bash
node /root/.agents/skills/cloud_server_sync/scripts/feishu_sync.js --source <path>
```

## Runtime Files

- `/root/.config/opencode/cloud_server_sync/config.json` stores shared local config, such as `remoteRootPath` and optional `notifyTo`
- `/root/.local/share/opencode/cloud_server_sync/state.json` stores the local absolute path to Feishu/Lark doc mapping for all synced sources
- `/root/.local/share/opencode/cloud_server_sync/manifest.json` is generated from state and uploaded during live sync
- `.cloud_server_sync_manifest.json` is uploaded as a normal Drive file under the remote root for fresh-machine recovery

Recommended config:

```json
{
  "remoteRootPath": ["cloud_server_aly"]
}
```

Do not put a fixed `source` in the global config unless the user explicitly wants a default source. Prefer passing `--source <path>` per run so multiple projects share one global state.

## Agent-Safe Workflow

1. Read `/root/.config/opencode/cloud_server_sync/config.json` before running sync.
2. Confirm the user-specified `--source` points to the intended local directory.
3. Confirm `remoteRootPath` has been changed from `CHANGE_ME_SERVER_NAME` to this server's stable folder name, for example `cloud_server_aly` or `cloud_server_jp`.
4. Always run `node /root/.agents/skills/cloud_server_sync/scripts/feishu_sync.js --dry-run --source <path>` before the first live sync for a new source.
5. Review the dry-run remote root and remote path preview with the user before live sync.
6. After live sync, the script uploads `.cloud_server_sync_manifest.json` to the remote root as a normal Drive file for fresh-machine recovery.
7. Do not point `--source` at broad system directories such as `/`, `/root`, `/etc`, or `/var` unless the user explicitly confirms that exact path.
8. If a demo or test run created the wrong remote root, ask before deleting or renaming existing Drive content.

## Restore Workflow Guidance

Remote-to-local restore is a recovery workflow, not active bidirectional sync.

When the user asks about restoring cloud docs to local files:

1. Explain that normal sync only runs local -> Feishu/Lark.
2. Use `node /root/.agents/skills/cloud_server_sync/scripts/feishu_restore.js --dry-run --restore-root <path>` for preview when local state exists.
3. On a fresh machine without `/root/.local/share/opencode/cloud_server_sync/state.json`, ask for the cloud manifest file token or the remote root folder URL/token.
4. Preview with `node /root/.agents/skills/cloud_server_sync/scripts/feishu_restore.js --dry-run --manifest-file-token <file_token> --restore-root <path>` or `node /root/.agents/skills/cloud_server_sync/scripts/feishu_restore.js --dry-run --manifest-folder-token <folder_url_or_token> --restore-root <path>`.
5. Require an explicit restore root from the user.
6. Do not restore directly into `/`, `/root`, `/etc`, `/var`, or the original source path unless the user explicitly confirms that exact target.
7. Do not overwrite existing local files or delete local files by default.
8. Use `--execute` only after the user reviews the dry-run output.
9. Use `--overwrite` only when the user explicitly asks to replace existing local files.
10. Treat restore output as Feishu/Lark document export, not byte-for-byte backup. The script reports checksum matches and mismatches after live restore.
11. Use `--normalize-export` only when the user asks for best-effort cleanup of Feishu Markdown export quirks; it is off by default to avoid fighting future platform changes.

## Remote Path Rule

All absolute local paths are preserved relative to `/` under the configured remote root.

Examples:

- `/workspace/example-docs` -> `cloud_server_aly/workspace/example-docs`
- `/srv/demo/config-snippets` -> `cloud_server_jp/srv/demo/config-snippets`

## Important Notes

- The script auto-creates missing remote folders
- Sync is one-way: local -> Feishu/Lark
- Remote -> local is a separate restore workflow, not bidirectional sync
- Restore through doc export can differ from the original file because Feishu/Lark may insert titles, escape Markdown punctuation, or change spacing
- Multiple source directories share the same global state file
- Fresh-machine restore can use the `.cloud_server_sync_manifest.json` file token or a remote root folder URL/token containing that manifest
- Important manual operations can send a short notification using `node /root/.agents/skills/cloud_server_sync/scripts/lark_notify.js --text "..."`
- Use `--dry-run` before first syncing any sensitive or system directory
- Live sync is blocked while `remoteRootPath` still contains `CHANGE_ME_SERVER_NAME` or `example_server_sync`
