# Permissions

## Required User Scopes

This workflow expects a user-identity flow via `lark-cli auth login`.

Minimum scopes used by the current implementation:

- `docx:document:create`
- `docx:document:readonly`
- `docx:document:write_only`
- `docs:document.media:upload`
- `wiki:node:create`
- `wiki:node:read`
- `board:whiteboard:node:create`
- `space:folder:create`
- `space:document:retrieve`
- `drive:drive.metadata:readonly`
- `im:message`
- `im:message.send_as_user`
- `contact:user.base:readonly`
- `contact:contact.base:readonly`

## Recommended Login Command

```bash
lark-cli auth login --domain drive --domain docs --domain im --domain contact --domain wiki
```

## Notes

- Folder creation uses Drive APIs and requires `space:folder:create` or equivalent covered access.
- Notifications are sent as the authenticated user.
- If you add new scopes later, re-run `lark-cli auth login`.
