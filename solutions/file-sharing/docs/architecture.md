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

## Path Strategy

- Remote root is configurable
- Absolute local paths are preserved relative to `/`
- This keeps path meaning stable across multiple source directories

## Safety Characteristics

- One-way sync only
- No automatic remote deletion during normal sync
- Serialized writes with retry/backoff
- Manual high-risk operations should send brief notifications
- Real local state must stay outside the public repository
