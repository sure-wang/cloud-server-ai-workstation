# Architecture

## Components

1. Local source directory
   - contains `.md` / `.txt` files to sync

2. Sync script
   - `scripts/feishu_sync.js`
   - scans local files
   - computes content hashes
   - ensures remote folder hierarchy exists
   - creates or updates Feishu/Lark online docs
   - writes local state

3. Notification helper
   - `scripts/lark_notify.js`
   - sends short IM notifications as the authenticated user

4. `lark-cli`
   - Drive folder operations
   - Docs create/update operations
   - IM notifications

5. Local state
   - `data/state.json`
   - maps absolute local paths to remote doc IDs and folder tokens

## Data Flow

```text
Local files
   |
   v
feishu_sync.js
   |
   +--> lark-cli drive +create-folder
   |
   +--> lark-cli docs +create / +update
   |
   +--> data/state.json
   |
   +--> lark_notify.js / lark-cli im +messages-send
```

## Restore Flow

Remote-to-local support should be modeled as restore, not bidirectional sync.

```text
Feishu/Lark online docs
   |
   v
lark-cli drive +export
   |
   +--> explicit local restore root
   |
   +--> restore report / notification
```

The restore flow should use `data/state.json` to identify documents originally created by this solution and to reconstruct the original absolute path under a separate restore root.

For example, a document originally synced from `/srv/demo/notes/a.md` should restore to a path such as `/restore/cloud_server_aly/srv/demo/notes/a.md`, not directly back to `/srv/demo/notes/a.md` by default.

## Why Not Bidirectional Sync

Full bidirectional sync is intentionally out of scope because it would need conflict resolution, rename tracking, deletion semantics, and format normalization between local Markdown/text files and Feishu/Lark docx exports.

The safer approach is:

- local -> Feishu/Lark for normal publishing
- Feishu/Lark -> local restore directory for recovery or migration
- explicit human confirmation before overwriting any existing local file

## Path Strategy

- Remote root is configurable
- Absolute local paths are preserved relative to `/`
- This keeps path meaning stable across multiple source directories

## Safety Characteristics

- One-way sync only
- No automatic remote deletion during normal sync
- Planned restore writes to an explicit restore root instead of original source paths by default
- Serialized writes with retry/backoff
- Manual high-risk operations should send brief notifications
- Real local state must stay outside the public repository
