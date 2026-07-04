# TODO

## Completed Baseline: Additional Service Subdomains

The basic `sub2api` subdomain pattern is now captured in:

- [opencode-lucky-sub2api.md](./opencode-lucky-sub2api.md)
- [../examples/Caddyfile.opencode-lucky-sub2api.example](../examples/Caddyfile.opencode-lucky-sub2api.example)
- [../../sub2api-deployment/docs/localhost-behind-caddy.md](../../sub2api-deployment/docs/localhost-behind-caddy.md)

Future work should refine this only after another real setup exposes new edge cases.

## Deferred Follow-Up: Additional Service Subdomains

This module currently documents the routing patterns for browser AI tools and admin panels.

One practical next step is to extend the same subdomain-first pattern to small helper services such as:

- `api.example.com`
- `sub2api.example.com`
- other local single-purpose HTTP services

For `sub2api`, the deployment-side recovery notes now live in [../../sub2api-deployment/README.md](../../sub2api-deployment/README.md).
This module should stay focused on the public HTTPS entry, not on the Docker deployment itself.

## Why This Work Was Deferred

Do not continue expanding public-facing routes while the underlying host situation is unstable.

If the current cloud server or provider is no longer reliable, pause additional integration work until there is a stable replacement host or migration target.

This avoids spending time on:

- DNS changes that may soon be invalid
- reverse proxy work tied to a host that may disappear
- partial hardening on infrastructure that is about to be replaced

## Recommended Restart Conditions

Resume this work only after all of the following are true:

1. the replacement server or hosting plan is confirmed stable
2. DNS is under control again
3. the reverse proxy entrypoint is restored
4. the target upstream service is confirmed reachable locally

## Suggested Future Steps For `sub2api`

1. restore or confirm the local `sub2api` deployment first
2. identify the local upstream port
3. verify whether the service expects `/` or a prefixed base path
4. prefer `sub2api.example.com` over `example.com/sub2api/`
5. add a dedicated `Caddy` site block
6. decide whether the upstream port must be localhost-only
7. validate browser access, API responses, and any websocket or SSE behavior
8. only then remove any temporary path-based fallback, if one was added

## Public-Safe Example

```caddy
sub2api.example.com {
    encode zstd gzip
    reverse_proxy http://127.0.0.1:8080
}
```

If the service turns out to be path-compatible and there is a strong reason to keep a shared root domain, a path route can still be added temporarily. But the default recommendation remains: one subdomain per app.

## Migration Note

When rebuilding on a new host, treat this as a fresh setup task rather than assuming the old server state still matters.

Re-check:

- actual service ports
- TLS behavior
- local firewall state
- DDNS ownership
- whether the service should remain public at all
