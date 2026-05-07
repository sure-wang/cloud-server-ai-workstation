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
["example_server_sync"]
```

then:

- `/workspace/example-docs` -> `example_server_sync/workspace/example-docs`
- `/srv/demo/content` -> `example_server_sync/srv/demo/content`
- `/srv/demo/config-snippets` -> `example_server_sync/srv/demo/config-snippets`

## Safety Suggestions

- Always run `--dry-run` before first syncing a new directory
- Avoid pointing the live sync at sensitive system directories until you verify the file set and remote path mapping
- Do not publish raw sync logs or notification screenshots without redacting runtime metadata
