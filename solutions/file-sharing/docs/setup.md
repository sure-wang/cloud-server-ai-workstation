# Setup

## Prerequisites

- Node.js 18+
- `lark-cli` installed and available in `PATH`
- A Feishu/Lark custom app with the required scopes enabled
- User authorization completed with `lark-cli auth login`

## Install `lark-cli`

Follow the official installation guide:

- `npm install -g @larksuite/cli`

## Configure the CLI

Initialize app configuration:

```bash
lark-cli config init
```

Log in with user identity and the needed domains:

```bash
lark-cli auth login --domain drive --domain docs --domain im --domain contact --domain wiki
```

Verify:

```bash
lark-cli auth status
```

## Create Local Config

Copy the example file:

```bash
cp config/config.example.json config/config.json
```

Edit:

- `source`
- `remoteRootPath`
- optionally `notifyTo`

## Dry Run First

```bash
node scripts/feishu_sync.js --dry-run
```
