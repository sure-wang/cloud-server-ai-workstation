# Architecture

## Boundary

This module stops at "the service is healthy on the server itself."

That means the documented success state is:

- Docker is installed
- the `sub2api` stack is running
- `curl http://127.0.0.1:PORT/health` succeeds
- admin bootstrap details are recorded privately

Public domain binding, HTTPS, and reverse-proxy exposure belong to `../../web-access-routing/`.

## Why This Boundary Matters

- It keeps deployment recovery reusable across different DNS and proxy setups.
- It avoids mixing provider-specific ingress details into the base service bootstrap.
- It makes disaster recovery faster: restore the app locally first, then reconnect public access.

## Recovery Model

Treat the server as disposable infrastructure.

Persist only what you intentionally want to migrate:

- deployment docs
- public-safe config templates
- private secret material stored outside the public repo
- application data directories you explicitly back up

Do not depend on:

- remembered shell history
- one-off temporary passwords that were never recorded safely
- provider console screenshots as the only source of truth

## Suggested Layering

1. Server access layer: SSH, package manager, basic OS checks
2. Runtime layer: Docker Engine, Docker Compose
3. Stability layer: swap, `vm.swappiness`, `vm.overcommit_memory`
4. Service layer: `sub2api`, Postgres, Redis
5. Public ingress layer: DNS, reverse proxy, HTTPS

This module covers layers 1 through 4.
