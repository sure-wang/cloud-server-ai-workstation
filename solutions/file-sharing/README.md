# File Sharing Solution

[中文说明](./README.zh-CN.md)

One-way sync from local cloud-server text files to real Feishu/Lark Drive folders and online docs.

## At a Glance

- Local source: cloud-server directories
- Remote target: real Feishu/Lark Drive folders + online docx docs
- Supported files: `.md`, `.txt`
- Notification model: short IM notices as the authenticated user
- Safety posture: one-way sync, no automatic remote deletion during normal runs

## What It Solves

- Keep selected server-side `.md` / `.txt` files from multiple source directories available in Feishu/Lark online docs.
- Keep a cloud manifest file for recovery on a fresh machine.
- Preserve local absolute path structure under a configurable remote root folder.
- Send short IM notifications for important operations and sync summaries.
- Make the workflow reusable across future AI/Agent sessions.

## Current Scope

- Supported file types: `.md`, `.txt`
- One-way sync only: local -> Feishu/Lark
- One online doc per local file
- Real Drive folders are auto-created as needed
- Existing docs are updated in place with overwrite mode
- A `.cloud_server_sync_manifest.json` file is uploaded to the remote root after live sync

## Planned Restore Workflow

Remote-to-local support is treated as a separate restore workflow, not full bidirectional sync.

The restore use case is recovery or migration from previously synced Feishu/Lark online docs back to a chosen local restore directory. `scripts/feishu_restore.js` can use local `/root/.local/share/opencode/cloud_server_sync/state.json` or download the cloud `.cloud_server_sync_manifest.json` by file token, exports known docx documents through `lark-cli drive +export`, and writes into an explicit restore root after a dry-run review.

Restore should not overwrite original source paths, delete local files, or resolve local/remote edit conflicts by default. Because restore exports Feishu/Lark online docs as Markdown, restored files may not be byte-for-byte identical to the original files; the restore script reports checksum matches and mismatches when the manifest contains checksums.

## Typical Workflow

1. Choose a local directory on the server
2. Run a `--dry-run` preview
3. Let the script create or reuse the matching remote folder hierarchy
4. Create or update Feishu/Lark online docs
5. Receive a short summary notification

## Non-Goals

- arbitrary binary file mirroring
- full bidirectional sync
- automatic conflict resolution between local edits and remote doc edits
- rename tracking across local path changes
- remote automatic deletion when local files disappear

## Quick Start

1. Install and configure `lark-cli`
2. Create `/root/.config/opencode/cloud_server_sync/config.json`
3. Replace `CHANGE_ME_SERVER_NAME` with the stable folder name for this server, for example `cloud_server_aly` or `cloud_server_jp`
4. Run a preview for a source directory:

```bash
node scripts/feishu_sync.js --dry-run --source /absolute/path/to/local/source
```

5. Run the live sync:

```bash
node scripts/feishu_sync.js --source /absolute/path/to/local/source
```

Runtime files default to OpenCode global locations:

- `/root/.config/opencode/cloud_server_sync/config.json`
- `/root/.local/share/opencode/cloud_server_sync/state.json`
- `/root/.local/share/opencode/cloud_server_sync/manifest.json`

## Agent-Safe Quick Start

This module is intended to be usable by humans directly and by AI agents through the included skill template.

Install the skill template for OpenCode:

```bash
npx -y skills add ./skills/cloud_server_sync -g --agent opencode --copy -y
```

After installing a new skill, restart the active OpenCode service or session so the runtime reloads the skill list. For a systemd deployment, use:

```bash
systemctl restart opencode.service
```

Recommended agent flow after installing the skill:

1. Read `/root/.config/opencode/cloud_server_sync/config.json`
2. Confirm the `--source` path and `remoteRootPath` with the human operator
3. Run `node /root/.agents/skills/cloud_server_sync/scripts/feishu_sync.js --dry-run --source <path>`
4. Review the remote root and remote path preview
5. Run live sync only after explicit confirmation for a new source

## Good Fit

- cloud-server notes and operational docs
- deployment checklists
- runbooks and troubleshooting records
- cross-device access to text knowledge stored on a server

## Not a Good Fit

- binary asset libraries
- large media archives
- exact file-byte mirroring requirements
- workflows that require automatic remote deletion on local removal

## Directory Layout

- `scripts/` — sync and notification scripts
- `config/` — public-safe config template
- `docs/` — setup, usage, permissions, troubleshooting
- `skills/` — reusable installable skill template for AI tools
- `examples/` — public-safe example state

## Key Behavior

Absolute local paths are preserved relative to `/` under the configured remote root.

Examples:

- `/workspace/example-docs` -> `cloud_server_aly/workspace/example-docs`
- `/srv/demo/content` -> `cloud_server_jp/srv/demo/content`
- `/srv/demo/config-snippets` -> `cloud_server_jp/srv/demo/config-snippets`

## Safety Notes

- Do not commit real runtime config or state files
- Runtime state and manifest cache belong under `/root/.local/share/opencode/cloud_server_sync`
- Do not run live sync while `remoteRootPath` still contains `CHANGE_ME_SERVER_NAME` or an example value
- Do not live-sync sensitive system directories before a `--dry-run` review
- If you share logs, screenshots, or notifications publicly, redact local paths, doc IDs, folder tokens, and other runtime metadata

## Current Limitations

- state is keyed by absolute local path, so local moves/renames are treated as new remote docs
- remote-to-local restore is a separate recovery workflow, not active bidirectional sync
- doc-export restore can change Markdown formatting; use `--normalize-export` only for explicit best-effort cleanup
- remote-only cleanup is a separate manual operation, not part of normal sync
- only text-oriented files are handled in the current public version

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
