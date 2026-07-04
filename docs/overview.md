# Repository Overview

This repository is meant for practical, reproducible examples of running AI/Agent workflows on cloud servers.

Each solution module should include:

- a clear problem statement
- architecture notes
- setup instructions
- usage examples
- troubleshooting notes
- public-safe config and state examples
- agent-safe operating notes when the workflow is expected to be reused by AI agents

## Human and Agent Friendliness

New modules should be usable by a human operator reading the docs and by an AI agent following explicit instructions.

For human operators, document the direct commands, expected outputs, recovery steps, and any manual confirmation points.

For AI agents, document the safe workflow boundaries:

- which config files must be read before acting
- which values must be confirmed with the human operator
- which commands are preview-only versus live writes
- which paths, services, or remote resources are unsafe to touch without explicit confirmation
- whether an included skill should be installed, and whether the agent runtime must be restarted or a new session opened before the skill is visible

If a module includes scripts that can create, update, delete, or publish remote resources, provide a dry-run or preview workflow and make it prominent in the README.

Operational screenshots should follow [screenshot-guidelines.md](./screenshot-guidelines.md) before public sharing.

Published modules currently include [solutions/file-sharing](../solutions/file-sharing/), [solutions/sub2api-deployment](../solutions/sub2api-deployment/), and [solutions/web-access-routing](../solutions/web-access-routing/).
