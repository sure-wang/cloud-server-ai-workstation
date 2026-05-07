# Setup

## 1. Prepare DNS

Create one DNS record per app.

Example public-safe records:

- `agent.example.com` -> `203.0.113.10`
- `panel.example.com` -> `203.0.113.10`
- `api.example.com` -> `203.0.113.10`

If your server IP changes over time, keep these records inside your DDNS workflow instead of maintaining them manually.

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
