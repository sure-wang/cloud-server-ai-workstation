# OpenCode, Lucky, And Sub2API Behind Caddy

This note records a public-safe recovery pattern for exposing three local services through HTTPS subdomains:

- `agent.example.com` -> OpenCode headless server on `127.0.0.1:4096`
- `panel.example.com` -> Lucky panel on `127.0.0.1:16601`
- `api.example.com` -> sub2api on `127.0.0.1:8080`

The goal is to make `Caddy` the only public HTTP entrypoint while keeping service-specific ports local.

## Human-Assisted Steps

Some parts of this setup should be done by a human operator, not blindly automated.

### Lucky panel setup

Use the Lucky web UI to:

- set the admin account and password
- set the safe entry path, for example `/lucky/`
- add DNS provider credentials
- create DDNS records for the root domain and service subdomains
- confirm the DDNS task reports the expected public IP

Do not commit DNS provider access keys, panel passwords, or exported Lucky state files.

### DNS and provider console checks

Before asking Caddy for public certificates, confirm:

- the subdomains resolve to the current server IP
- provider-side security groups allow `80` and `443`
- old public app ports are not required anymore

Useful checks:

```bash
getent ahostsv4 agent.example.com
getent ahostsv4 panel.example.com
getent ahostsv4 api.example.com
```

### OpenCode password choice

OpenCode must not be exposed without a server password.

Use a private value for `OPENCODE_SERVER_PASSWORD`, and optionally add Caddy `basic_auth` in front of it as a second layer.

## Backup First

Before changing panel routes, DDNS state, or generated deployment files, make a backup that can be restored quickly.

Suggested local backups on the server:

```bash
cp -a /opt/lucky/goodluck /opt/lucky/goodluck.bak-$(date +%Y%m%d-%H%M%S)
cp -a /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-$(date +%Y%m%d-%H%M%S)
cp -a /opt/sub2api/deploy/.env /opt/sub2api/deploy/.env.bak-$(date +%Y%m%d-%H%M%S)
```

For Lucky password recovery, deleting `lucky_base.lkcf` resets panel settings but should not be treated as a normal migration strategy. Back it up first:

```bash
cp -a /opt/lucky/goodluck/lucky_base.lkcf /opt/lucky/goodluck/lucky_base.lkcf.bak-$(date +%Y%m%d-%H%M%S)
rm -f /opt/lucky/goodluck/lucky_base.lkcf
docker restart lucky
```

This resets Lucky base settings. Module data should be preserved, but the operator still needs to re-check the panel after restart.

## OpenCode Upstream

Run OpenCode as a local-only systemd service.

See `../examples/opencode.service.example`.

Minimum validation:

```bash
systemctl daemon-reload
systemctl enable --now opencode
systemctl is-active opencode
curl -I -u agent-user:PRIVATE_PASSWORD http://127.0.0.1:4096/
```

If OpenCode logs a warning that `OPENCODE_SERVER_PASSWORD` is not set, stop and fix that before exposing it through Caddy.

## Lucky Upstream

Prefer binding the Lucky container to localhost:

```bash
docker run -d --name lucky --restart=always \
  -p 127.0.0.1:16601:16601 \
  -v /opt/lucky/goodluck:/goodluck \
  gdy666/lucky:latest
```

If Lucky is already running, inspect the current mapping before changing it:

```bash
docker ps --filter name=lucky
docker inspect lucky --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}'
```

When the panel safe entry is `/lucky/`, redirect the subdomain root to that path in Caddy.

## Sub2API Upstream

If `sub2api` was previously exposed as `0.0.0.0:8080`, move it behind Caddy by binding the host port to localhost.

If the compose file supports `BIND_HOST`, set this in the private `.env`:

```env
BIND_HOST=127.0.0.1
```

Then restart only through Compose:

```bash
cd /opt/sub2api/deploy
docker compose up -d
docker compose ps
```

Validate that the direct public port is gone while the local and HTTPS paths still work:

```bash
ss -ltnp | grep 8080
curl -fsS http://127.0.0.1:8080/health
curl -fsS https://api.example.com/health
```

The target listener should look like:

```text
127.0.0.1:8080
```

not:

```text
0.0.0.0:8080
```

## Caddy Route

Use one subdomain per app.

See `../examples/Caddyfile.opencode-lucky-sub2api.example`.

After writing `/etc/caddy/Caddyfile`:

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy || systemctl restart caddy
```

## Final Checks

Service checks:

```bash
systemctl is-active caddy
systemctl is-active opencode
docker ps --filter name=lucky
cd /opt/sub2api/deploy && docker compose ps
```

Listener checks:

```bash
ss -ltnp | grep -E ':80|:443|:4096|:16601|:8080'
```

Target shape:

- `Caddy` listens on `*:80` and `*:443`
- OpenCode listens on `127.0.0.1:4096`
- Lucky listens on `127.0.0.1:16601`
- sub2api listens on `127.0.0.1:8080`

HTTPS checks:

```bash
curl -fsS https://api.example.com/health
curl -fsS https://panel.example.com/lucky/ | head
curl -fsS -u agent-user:PRIVATE_PASSWORD https://agent.example.com/ | head
```

Caddy certificate checks:

```bash
journalctl -u caddy -n 160 --no-pager
```

Look for `certificate obtained successfully` for each subdomain.

## Public Safety

Before committing documentation or examples, remove:

- real domains
- real public IPs
- OpenCode passwords
- Caddy basic-auth hashes derived from real passwords
- Lucky accounts, safe-entry secrets, and state files
- DNS provider access keys
- sub2api `.env` secrets
- OpenCode provider API keys
