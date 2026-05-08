# Recovery Checklist

This file records only the parts of the workstation that have already been restored and verified.

It is intentionally incomplete.

Do not use it as a full target-state checklist yet.

## Recovered So Far

### 1. SSH Access Recovery

- key-based SSH login has been restored for the currently active cloud servers
- follow-up operations no longer depend on password-only login for routine work

### 2. `sub2api` Service Recovery

- `sub2api` has been redeployed on a rebuilt cloud server using Docker Compose
- the stack includes:
  - `sub2api`
  - `postgres`
  - `redis`
- local health verification has been completed with `/health`

### 3. Lightweight Host Stability Guardrails

- swap has been enabled on the lightweight replacement host
- the current recovery baseline uses:
  - swap enabled
  - `vm.swappiness=10`
  - `vm.overcommit_memory=1`
- these settings were added because the rebuilt host is low-memory and now carries part of the recovery load

### 4. Public Port Verification For The Rebuilt Host

- raw application access on the service port was verified after the provider-side ingress rule was opened
- this confirms the service itself is healthy and reachable before the later HTTPS reverse-proxy phase

## Intentionally Not Listed Yet

The following are not included here yet because they are not fully restored or not yet documented in public-safe form:

- full domain binding and HTTPS recovery
- reverse-proxy reattachment for every recovered service
- broader AI / Agent workstation components outside the currently restored `sub2api` path
- any private secrets, machine-local identifiers, or provider-console specifics

## How To Use This File

Use this checklist as a "confirmed recovered already" snapshot.

Only add items here after they have been:

1. actually restored
2. minimally verified
3. described in a public-safe way
