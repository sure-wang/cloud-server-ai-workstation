# Troubleshooting

## 1. Missing Scope Errors

Symptoms:

- `permission denied`
- `missing required scope`
- Drive or Docs commands prompt for authorization

Actions:

1. Confirm the scope is enabled in the app
2. Re-run `lark-cli auth login`
3. Verify with `lark-cli auth status`

## 2. Duplicate Remote Folders

Some CLIs can create same-name folders repeatedly if they do not first list existing children.

This implementation avoids that by listing existing folder contents before creating a child folder.

## 3. Local Path Changed, Remote Doc Recreated

The state file is keyed by absolute local path.

If you move a local file to a new path, the script treats it as a new remote doc.

## 4. Deleted Remote Doc Still in State

If a remote doc was deleted manually, the local state can still point to the old token.

Fix:

- remove the corresponding entry from `data/state.json`
- re-run sync so the doc is recreated

## 5. Rate Limits

The script writes serially, spaces out write operations, and retries transient write failures with exponential backoff.

Still, avoid pointing it at huge trees without first running a dry-run review.

## 6. Public Sharing Hygiene

If you publish screenshots, terminal logs, or chat notifications from a real environment, redact:

- local absolute paths
- doc IDs
- folder tokens
- user IDs / open IDs
- other runtime identifiers returned by the platform

## 7. Wrong Remote Root Created

Symptoms:

- A live test created folders under `example_server_sync`
- A live test created folders under a demo root instead of the current server root
- The new server folder is not a sibling of another expected server folder such as `cloud_server_jp`

Actions:

1. Stop live syncs until `config/config.json` has the intended `remoteRootPath`
2. Run `node scripts/feishu_sync.js --dry-run` and review the remote root and remote path preview
3. Decide whether the wrong remote folder should be renamed, moved, or deleted
4. Ask the document owner or operator before deleting or renaming existing Drive content
5. Remove stale entries from `data/state.json` only after deciding how to handle the remote content
