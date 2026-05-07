# Troubleshooting

## White Screen After Login

Likely cause:

- the app is mounted under a subpath but serves absolute root asset URLs

Check the returned HTML for paths like:

- `/assets/...`
- `/favicon...`
- `/manifest.webmanifest`

If those are present, move the app to a dedicated subdomain.

## `404` On A New Subdomain Root

Likely cause:

- the upstream app expects an internal safe URL such as `/panel/`

Fix:

- add a root redirect on the subdomain
- or route the app to the exact internal path it expects

## Legacy Path Still Needed

If existing users already depend on `/panel/`, keep the path route for a transition period while documenting the new subdomain.

## Public IP Direct Access Still Works

Likely cause:

- the upstream listens on `*:PORT`
- no firewall rule blocks non-local access

Check:

```bash
ss -ltnp | grep 16601
iptables -S INPUT
ip6tables -S INPUT
```

## Caddy Works But Upstream HTTPS Fails

Some local admin panels expose self-signed HTTPS.

In that case, use:

```caddy
transport http {
    tls_insecure_skip_verify
}
```

Only do this for the local upstream hop when you understand why it is needed.

## DNS Looks Right But HTTPS Is Not Ready Yet

Likely cause:

- DNS has propagated but `Caddy` has not finished certificate issuance yet

Check:

```bash
journalctl -u caddy -n 100 --no-pager
```

Wait until the ACME validation and certificate download complete.
