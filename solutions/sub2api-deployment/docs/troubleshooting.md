# Troubleshooting

## Docker Installed But `docker compose` Fails

Check whether the Compose plugin was installed, not just the engine:

```bash
docker compose version
```

If that fails, install the Compose plugin package for the distribution you are using.

## The Stack Starts Slowly On A Small Server

This is common when:

- image pulls are cold
- the server has limited memory
- package mirrors or upstream registries are slow

Differentiate between "slow" and "broken" before changing the design:

```bash
docker compose ps
docker compose logs --tail=100 sub2api postgres redis
free -h
swapon --show
```

## `/health` Works Locally But The Public IP Times Out

That usually means the app is healthy but the public network path is not.

Re-check:

- cloud-provider security group or firewall rules
- host firewall state
- whether the service is really listening on `0.0.0.0`

Useful checks:

```bash
ss -ltnp | grep 8080
curl -fsS http://127.0.0.1:8080/health
```

If you plan to bind a domain anyway, move on to `../../web-access-routing/` instead of keeping the raw port public forever.

## Redis Warns About `vm.overcommit_memory`

This is a common kernel-level warning on lightweight servers.

Apply:

```bash
sysctl vm.overcommit_memory=1
```

Then persist it.

## The Server Feels Unstable Under Memory Pressure

Check:

- `free -h`
- `swapon --show`
- `cat /proc/sys/vm/swappiness`
- container logs

If swap is absent, add it.
If swap is huge and the machine becomes uncomfortably slow, reduce it later.

The goal is not maximum swap usage. The goal is graceful failure avoidance on a small host.
