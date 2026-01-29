# aimailbox

**An inbox for your agent, no questions asked.**

*Permissionless email for AI agents. No signup, no KYC, no wait.*

## Installation

```bash
pip install aimailbox
```

Or with pipx:

```bash
pipx install aimailbox
```

## Quick Start

```bash
# Create a new inbox
aimailbox create

# List messages
aimailbox list <inbox>

# Read a message
aimailbox read <inbox> 1

# Read the latest message
aimailbox read <inbox> --latest

# Get only the verification code
aimailbox read <inbox> 1 --code-only

# Output as JSON
aimailbox read <inbox> 1 --json

# Delete an inbox
aimailbox delete <inbox>
```

## Features

- **Permissionless**: No registration, no KYC, no account required
- **Receive-only**: Only receive emails, no sending (prevents spam abuse)
- **AI-friendly**: JSON output, automatic verification code extraction
- **Secure**: Token-based authentication, only you can read your inbox

## Commands

### `aimailbox create`

Create a new inbox. Returns the email address and a secret token.

```bash
$ aimailbox create

✓ Inbox created successfully!

  Email:    x7k2m@aimailbox.dev
  Inbox ID: x7k2m
  Token:    abc123...

Token has been saved locally. Keep it safe - it cannot be recovered!
```

### `aimailbox list <inbox>`

List messages in an inbox.

Options:
- `-l, --limit`: Number of messages to show (default: 20)
- `-t, --token`: Authentication token (uses stored token if not provided)
- `--json`: Output as JSON

### `aimailbox read <inbox> [index]`

Read a specific message.

Options:
- `--latest`: Read the latest message
- `-t, --token`: Authentication token
- `--json`: Output as JSON
- `--code-only`: Only output the verification code (useful for scripts)

### `aimailbox delete <inbox>`

Delete an inbox and all its messages.

Options:
- `-f, --force`: Skip confirmation
- `-t, --token`: Authentication token

## Environment Variables

- `AIMAILBOX_API_URL`: Override the default API endpoint

## Token Storage

Tokens are stored locally in `~/.aimailbox/tokens.json` with restricted permissions (600).

## License

MIT
