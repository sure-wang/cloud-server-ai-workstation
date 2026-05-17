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

## Create Global OpenCode Config

Create the runtime config directory:

```bash
mkdir -p /root/.config/opencode/cloud_server_sync
```

Create `/root/.config/opencode/cloud_server_sync/config.json`:

```json
{
  "remoteRootPath": ["cloud_server_aly"]
}
```

Edit:

- `remoteRootPath`; replace `CHANGE_ME_SERVER_NAME` with this server's stable remote folder name, for example `cloud_server_aly` or `cloud_server_jp`
- optionally `notifyTo`

The script blocks live sync while `remoteRootPath` still contains a placeholder or example value.

Pass the source directory per run with `--source <path>` so multiple source directories can share `/root/.local/share/opencode/cloud_server_sync/state.json`.

The sync script also blocks broad source roots such as `/`, `/root`, `/etc`, `/var`, `/home`, and `/tmp` by default. Use `--allow-dangerous-source` only after an explicit human review of the dry-run file set.

## Agent Skill Setup

The solution can be operated manually with the Node.js scripts, or through the included AI-agent skill template.

Install the skill template for OpenCode:

```bash
npx -y skills add ./skills/cloud_server_sync -g --agent opencode --copy -y
```

Restart the active OpenCode service or session after installing a new skill. Long-running agent processes usually read the skill list at startup, so a restart is the most reliable way to make the new skill available.

For a systemd deployment:

```bash
systemctl restart opencode.service
```

If OpenCode is not running through systemd, restart the active OpenCode process or start a new session instead.

Recommended agent flow:

1. Read `/root/.config/opencode/cloud_server_sync/config.json`
2. Confirm `--source` and `remoteRootPath` with the human operator
3. Run `node /root/.agents/skills/cloud_server_sync/scripts/feishu_sync.js --dry-run --source <path>`
4. Review the remote root and remote path preview
5. Run live sync only after explicit confirmation for a new source

## Dry Run First

```bash
node scripts/feishu_sync.js --dry-run --source /absolute/path/to/local/source
```
