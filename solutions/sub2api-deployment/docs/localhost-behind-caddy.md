# Run Sub2API Behind Caddy

This note covers the final hardening step after `sub2api` is healthy locally and a Caddy HTTPS route is ready.

The desired state is:

- public internet -> `https://api.example.com`
- Caddy -> `http://127.0.0.1:8080`
- no direct public `SERVER_IP:8080` access

## Backup First

Back up the private deployment state before changing port bindings:

```bash
cd /opt/sub2api/deploy
cp -a .env .env.bak-$(date +%Y%m%d-%H%M%S)
cp -a docker-compose.yml docker-compose.yml.bak-$(date +%Y%m%d-%H%M%S)
```

Do not commit these files if they contain secrets.

## Bind To Localhost

If the compose file supports a `BIND_HOST` variable, set it in `.env`:

```env
BIND_HOST=127.0.0.1
```

Then recreate the app container:

```bash
docker compose up -d
docker compose ps
```

## Validate

The local health endpoint should still work:

```bash
curl -fsS http://127.0.0.1:8080/health
```

The HTTPS route should work:

```bash
curl -fsS https://api.example.com/health
```

The listener should be local-only:

```bash
ss -ltnp | grep 8080
```

Expected shape:

```text
127.0.0.1:8080
```

Avoid this shape after Caddy is in front:

```text
0.0.0.0:8080
```

## Rollback

If the HTTPS route does not work and you need a temporary rollback, restore the previous `.env` backup and recreate:

```bash
cp -a .env.bak-YYYYMMDD-HHMMSS .env
docker compose up -d
```

Treat rollback as temporary. The preferred final state is HTTPS through Caddy with a localhost-only upstream port.
