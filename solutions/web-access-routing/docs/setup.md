# Setup

## 1. Prepare DNS

Create one DNS record per app.

Example public-safe records:

- `agent.example.com` -> `203.0.113.10`
- `panel.example.com` -> `203.0.113.10`
- `api.example.com` -> `203.0.113.10`

If your server IP changes over time, keep these records inside your DDNS workflow instead of maintaining them manually.

For a Lucky-like DDNS panel, it is often cleaner to place the root domain and all service subdomains into the same sync task, for example:

- `example.com`
- `panel.example.com`
- `agent.example.com`
- `api.example.com`

This avoids partial drift where the root domain updates automatically but newer subdomains do not.

## 2. Install Or Reuse Caddy

Use `Caddy` as the public HTTPS entrypoint.

Keep each app behind a dedicated site block whenever possible.

## 3. Start With Subdomain Routes

```caddy
agent.example.com {
    encode zstd gzip
    reverse_proxy http://127.0.0.1:4096
}

panel.example.com {
    encode zstd gzip
    @root path /
    redir @root /panel/ 302

    reverse_proxy https://127.0.0.1:16601 {
        transport http {
            tls_insecure_skip_verify
        }
    }
}
```

Use the redirect pattern only if the upstream app really expects an internal subpath such as `/panel/`.

For Lucky-like panels, this pattern is often the correct one because the admin UI may be intentionally served behind a safe URL rather than `/`.

## 4. Keep A Legacy Path Entry Only If Needed

If users already rely on an old path route, keep it temporarily:

```caddy
example.com {
    handle /panel* {
        reverse_proxy https://127.0.0.1:16601 {
            transport http {
                tls_insecure_skip_verify
            }
        }
    }

    handle {
        respond 404
    }
}
```

Do not keep unnecessary path entries forever. Remove them once clients have moved to the new subdomain.

## 5. Restrict Admin Ports To Localhost

If the upstream app listens on all interfaces and cannot be changed cleanly, add a small systemd guard that inserts firewall rules at boot.

Example flow:

1. create `lucky-port-guard.service`
2. make it `WantedBy=multi-user.target`
3. insert IPv4 and IPv6 reject rules for the admin port except from localhost

See `../examples/lucky-port-guard.service.example`.

If the panel also supports DDNS or certificate management, keeping the panel reachable only through the reverse proxy still works well. The public HTTPS entry stays on `443`, while the real admin port remains a local implementation detail.

## 6. Validate The Final State

Useful checks:

```bash
systemctl status caddy
ss -ltnp | grep 16601
curl -kI https://panel.example.com/
curl -kI https://agent.example.com/
iptables -S INPUT
ip6tables -S INPUT
```

Target outcome:

- subdomains return expected pages or redirects
- public HTTPS works
- direct `https://SERVER_IP:ADMIN_PORT/...` access no longer works from external clients
- reverse proxy access still works

## 7. Three-Service AI Workstation Pattern

For a concrete OpenCode + Lucky + sub2api shape, see:

- `opencode-lucky-sub2api.md`
- `../examples/Caddyfile.opencode-lucky-sub2api.example`
- `../examples/opencode.service.example`

This pattern also documents the human-assisted steps that should not be treated as fully automated, such as Lucky panel setup, DDNS credential entry, safe-entry configuration, and backup-before-reset workflows.
