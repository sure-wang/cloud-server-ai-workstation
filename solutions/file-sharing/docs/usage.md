# Usage

## Default Run

```bash
node scripts/feishu_sync.js --source /absolute/path/to/local/source
```

This reads `/root/.config/opencode/cloud_server_sync/config.json` by default and writes state to `/root/.local/share/opencode/cloud_server_sync/state.json`.

## Preview Only

```bash
node scripts/feishu_sync.js --dry-run --source /absolute/path/to/local/source
```

Dry-run output includes the configured remote root and a remote path preview for each file that would be created or updated.

## Override Source Path

```bash
node scripts/feishu_sync.js --source /workspace/example-docs
```

## Override Config Path

```bash
node scripts/feishu_sync.js --config ./config/config.json --source /workspace/example-docs
```

## Runtime Files

- Config: `/root/.config/opencode/cloud_server_sync/config.json`
- State: `/root/.local/share/opencode/cloud_server_sync/state.json`
- Local manifest cache: `/root/.local/share/opencode/cloud_server_sync/manifest.json`
- Cloud manifest: `.cloud_server_sync_manifest.json` under the remote root folder

The state file is global for this OpenCode installation and can track files from multiple source directories by absolute path.

## Notification Helper

For important manual operations outside the sync script:

```bash
node scripts/lark_notify.js --text "cleaned old remote docs folder"
```

Messages use a short `op` prefix by default.

## Restore Workflow

Remote-to-local restore is a separate recovery workflow. It should not be treated as active bidirectional sync.

Live sync uploads `.cloud_server_sync_manifest.json` as a normal Drive file under the configured remote root. Keep that file available; it lets a fresh machine recover the original path-to-doc mapping without local `/root/.local/share/opencode/cloud_server_sync/state.json`.

Preview restore actions:

```bash
node scripts/feishu_restore.js --dry-run --restore-root /path/to/restore
```

Preview restore actions on a fresh machine by downloading the cloud manifest file first:

```bash
node scripts/feishu_restore.js --dry-run --manifest-file-token <manifest_file_token> --restore-root /path/to/restore
```

If you have the remote root folder URL or token instead of the manifest file token, let the script find `.cloud_server_sync_manifest.json` in that folder:

```bash
node scripts/feishu_restore.js --dry-run --manifest-folder-token <folder_url_or_token> --restore-root /path/to/restore
```

Both manifest options download a local runtime copy to `/root/.local/share/opencode/cloud_server_sync/manifest.json` by default.

Run restore after reviewing the preview:

```bash
node scripts/feishu_restore.js --execute --restore-root /path/to/restore
```

After live restore, the script compares restored files against the original checksums stored in the manifest when available. A mismatch usually means Feishu/Lark's Markdown export changed formatting, such as adding a document title, escaping punctuation, or adjusting blank lines.

Use best-effort export cleanup only when explicitly needed:

```bash
node scripts/feishu_restore.js --execute --normalize-export --restore-root /path/to/restore
```

`--normalize-export` is intentionally off by default. It only applies conservative cleanup, such as removing a first-line `# <title>` when it matches the manifest title and unescaping low-risk punctuation. This avoids corrupting output if Feishu/Lark changes its export behavior later.

Allow overwriting existing files only when explicitly requested:

```bash
node scripts/feishu_restore.js --execute --overwrite --restore-root /path/to/restore
```

Safety defaults:

- read `/root/.local/share/opencode/cloud_server_sync/state.json` to restore only known synced docs
- or download `.cloud_server_sync_manifest.json` with `--manifest-file-token` / `--manifest-folder-token` before previewing restore actions
- export Feishu/Lark docx documents as Markdown through `lark-cli drive +export`
- report checksum matches and mismatches after live export when the manifest has checksums
- require an explicit `--restore-root`
- write under the restore root, preserving the original absolute path below that root
- preserve the original local filename when possible; if Drive temporarily exports a non-Markdown original with an extra `.md` suffix, rename it back to the restore target
- do not write directly back to original source paths by default
- do not overwrite existing local files unless an explicit overwrite option is provided
- do not delete local files

This workflow is meant for disaster recovery, migration to a new server, and manual comparison after remote edits.

## Run Minimal Tests

```bash
npm test
```

Current minimal tests cover:

- argument parsing
- config merge behavior
- remote path derivation
- CLI JSON output parsing
- supported / skipped file classification

## Remote Path Mapping

If `remoteRootPath` is:

```json
["cloud_server_aly"]
```

then:

- `/workspace/example-docs` -> `cloud_server_aly/workspace/example-docs`
- `/srv/demo/content` -> `cloud_server_aly/srv/demo/content`
- `/srv/demo/config-snippets` -> `cloud_server_aly/srv/demo/config-snippets`

Use one stable remote root folder per server, such as `cloud_server_aly` and `cloud_server_jp`, so folders from different servers remain siblings in Drive.

Do not run live sync while `remoteRootPath` still contains `CHANGE_ME_SERVER_NAME` or another example value. Demo and test syncs create real Drive folders and online docs.

## Safety Suggestions

- Always run `--dry-run` before first syncing a new directory
- Confirm `remoteRootPath` names the current server before live sync
- Avoid pointing the live sync at sensitive system directories until you verify the file set and remote path mapping
- Do not publish raw sync logs or notification screenshots without redacting runtime metadata
