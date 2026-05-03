# Screenshot Publishing Guidelines

When sharing screenshots from a real cloud-server AI/Agent environment, treat screenshots as sensitive operational artifacts.

## Always Redact

- app IDs, app secrets, tokens, refresh tokens
- user IDs, open IDs, tenant IDs, union IDs
- folder tokens, document tokens, task IDs
- absolute local paths when they reveal private environment structure
- remote URLs that expose sensitive object IDs
- message IDs, log IDs, troubleshooting URLs containing request identifiers
- terminal history that includes private commands or local-only file names

## Strongly Consider Redacting

- server hostnames and public IPs
- private project names
- customer names, employee names, internal group names
- chat IDs, wiki space IDs, folder names tied to real organizations
- browser tabs or bookmarks visible in the screenshot

## Recommended Workflow

1. Capture the screenshot.
2. Review it at full size before publishing.
3. Redact identifiers and sensitive paths.
4. If the screenshot includes a command line, check for secrets in wrapped lines.
5. If the screenshot includes a notification or sync summary, redact runtime metadata such as doc IDs and folder tokens.

## Safer Alternatives

- Prefer screenshots from demo directories and demo remote roots.
- Prefer `--dry-run` output where possible.
- Prefer docs written from example configs rather than real environment output.

## Rule of Thumb

If a screenshot would help someone locate your server, identify your tenant, or access a specific remote object, redact it before publishing.
