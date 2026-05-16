# Usage

## Default Run

```bash
node scripts/feishu_sync.js
```

This reads `config/config.json` by default.

## Preview Only

```bash
node scripts/feishu_sync.js --dry-run
```

Dry-run output includes the configured remote root and a remote path preview for each file that would be created or updated.

## Override Source Path

```bash
node scripts/feishu_sync.js --source /workspace/example-docs
```

## Override Config Path

```bash
node scripts/feishu_sync.js --config ./config/config.json
```

## Notification Helper

For important manual operations outside the sync script:

```bash
node scripts/lark_notify.js --text "cleaned old remote docs folder"
```

Messages use a short `op` prefix by default.

## Planned Restore Workflow

Remote-to-local restore is planned as a separate recovery workflow. It should not be treated as active bidirectional sync.

Future restore command shape:

```bash
node scripts/feishu_restore.js --dry-run --restore-root /path/to/restore
```

Expected safety defaults:

- read `data/state.json` to restore only known synced docs
- export Feishu/Lark docx documents as Markdown through `lark-cli drive +export`
- require an explicit `--restore-root`
- write under the restore root, preserving the original absolute path below that root
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
