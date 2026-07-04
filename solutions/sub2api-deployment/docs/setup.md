# Setup

## 1. Start From A Fresh Server

Assume you already have:

- SSH access
- a Linux server with enough disk for Docker images and app data
- a decision about whether the app should be internal-only for now or later exposed publicly

On very small hosts, check memory early:

```bash
free -h
swapon --show
```

## 2. Install Docker And Compose

Prefer the current official Docker installation method for the target distribution.

Validate the runtime:

```bash
docker --version
docker compose version
systemctl is-active docker
```

## 3. Add Low-Memory Guardrails On Small Servers

If the server is small, add swap before starting the stack.

Typical public-safe pattern:

```bash
fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
printf '/swapfile swap swap defaults 0 0\n' >> /etc/fstab
sysctl vm.swappiness=10
sysctl vm.overcommit_memory=1
```

Persist the sysctl values in `/etc/sysctl.conf` or a dedicated drop-in file.

Use a smaller or larger swapfile depending on workload and acceptable slowdown. The exact size is a tradeoff, not a fixed memory ratio rule.

## 4. Clone `sub2api`

Example:

```bash
git clone https://github.com/Wei-Shaw/sub2api.git /opt/sub2api
cd /opt/sub2api/deploy
```

## 5. Generate Deployment Files

Run the upstream preparation script:

```bash
bash docker-deploy.sh
```

This should generate:

- `docker-compose.yml`
- `.env`
- local data directories

## 6. Set An Admin Password Intentionally

Do not depend on "I will read the random password from logs later."

Set a temporary admin password before first startup, store it privately, and rotate it after login if needed.

Also review at least these values in `.env`:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SERVER_PORT`
- `TZ`

See [../examples/env.override.example](../examples/env.override.example) for public-safe placeholders.

## 7. Start The Stack

```bash
docker compose up -d
docker compose ps
```

Target services:

- `sub2api`
- `postgres`
- `redis`

## 8. Verify Local Health

```bash
curl -fsS http://127.0.0.1:8080/health
docker compose logs --tail=50 sub2api
```

The important checkpoint is local health, not public reachability.

## 9. Decide What Happens Next

- If the service should stay internal for now, stop here.
- If it should later be reachable by domain and HTTPS, continue with `../../web-access-routing/`.

That second phase should cover:

- DNS
- reverse proxy
- TLS
- whether the upstream port should remain localhost-only
