# Architecture

## Preferred Pattern

Use one subdomain per web app.

Example public-safe mapping:

- `panel.example.com` -> admin panel upstream
- `agent.example.com` -> browser AI tool upstream
- `api.example.com` -> helper API upstream

This pattern keeps each app close to the way it already expects to run: from `/`, not from a prefixed subpath.

## HTTPS And SSL Model

The current server HTTPS/SSL model is:

- `Caddy` is the public HTTPS entrypoint.
- Caddy automatic HTTPS obtains and renews free Let's Encrypt certificates.
- The `Caddyfile` holds the reverse-proxy rules for each public subdomain.
- Caddy automatically redirects HTTP traffic to HTTPS for managed sites.

In this model, upstream services should stay private on `127.0.0.1:<port>` whenever possible. Public clients should reach services through `https://<subdomain>` rather than direct upstream ports.

## Why Subdomains Usually Win

### 1. Frontend compatibility

Many SPAs and bundled frontend apps emit absolute asset paths such as:

- `/assets/main.js`
- `/favicon.svg`
- `/manifest.webmanifest`

If such an app is mounted under `/tool/`, the browser may still request `/assets/main.js` from the domain root, which breaks the UI.

### 2. Simpler proxy logic

A subdomain often needs only:

```caddy
agent.example.com {
    reverse_proxy 127.0.0.1:4096
}
```

A path-based route often needs prefix stripping, path rewrites, or special upstream awareness.

### 3. Easier isolation

Per-subdomain routing makes it easier to apply:

- independent auth
- independent logging
- per-service migration
- future multi-host moves

## When A Path Route Can Still Work

A path route is acceptable if the app already supports it well.

Typical signs:

- HTML uses relative asset paths like `./static/...`
- app has a documented base-path option
- app already exposes an internal safe URL such as `/panel`

In that case, keep the path if it is already in use, or preserve it temporarily during migration.

## Example Migration Shape

### Before

- `https://example.com/opencode/`
- `https://example.com/panel/`

### After

- `https://opencode.example.com/`
- `https://panel.example.com/`
- optionally keep `https://example.com/panel/` during transition

## Port Exposure Principle

Prefer this model:

- public internet -> `Caddy` on `443`
- `Caddy` -> local upstream on `127.0.0.1:<port>`

If the upstream cannot bind to localhost and listens on `*:PORT`, add a host-level restriction so only local access remains possible.

## Example Case Mapping

A practical mixed setup can look like this:

- one browser AI tool moved from a broken path route to a subdomain because of root-relative frontend assets
- one admin panel kept behind both a legacy path route and a new subdomain because its internal safe URL still points to a subpath
- one local admin port protected with host firewall rules while still being reachable through the reverse proxy

## Lucky-Like Panel Behavior

Some admin panels expose an internal safe URL instead of serving their UI from `/`.

Public-safe example:

- admin listen port: `16601`
- internal safe URL: `/panel`

In that case, a clean migration strategy is:

- keep `https://example.com/panel/` during transition
- add `https://panel.example.com/` as the preferred new entry
- redirect `https://panel.example.com/` to `https://panel.example.com/panel/`

This gives users a stable subdomain without fighting the application's own URL model.

## DDNS Interaction

If the server public IP can change, keeping the subdomains inside the same DDNS workflow is often cleaner than mixing dynamic root records with separately managed static subdomain records.

Public-safe example record set:

- `example.com`
- `panel.example.com`
- `agent.example.com`
- `api.example.com`

That way, one DDNS task can keep all public entries aligned with the current server IP.
