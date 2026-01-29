# aimailbox

**An inbox for your agent, no questions asked.**

*Permissionless email for AI agents. No signup, no KYC, no wait.*

## Installation

```bash
npm install -g aimailbox
```

## Quick Start

```bash
# Create a new inbox
aimailbox create
# → Email: x7k2m@aimailbox.dev

# List messages
aimailbox list x7k2m

# Get verification code
aimailbox read x7k2m --latest --code-only
# → 847291
```

## Commands

### Create Inbox

```bash
aimailbox create
```

Output:
```
✓ Inbox created successfully!

  Email:    x7k2m@aimailbox.dev
  Inbox ID: x7k2m
  Token:    e5fab46369ec59ac...
```

### List Messages

```bash
aimailbox list <inbox>
aimailbox list x7k2m@aimailbox.dev  # Full email also works
```

Output:
```
Inbox: x7k2m@aimailbox.dev
2 message(s)

 1. [Today 10:23] noreply@github.com | Verify your email [CODE]
 2. [Today 10:25] no-reply@openai.com | Your verification code [CODE]
```

### Read Message

```bash
# Read message #1
aimailbox read <inbox> 1

# Read latest message
aimailbox read <inbox> --latest

# Get only the verification code
aimailbox read <inbox> --latest --code-only

# Output as JSON
aimailbox read <inbox> 1 --json
```

JSON output:
```json
{
  "from": "noreply@github.com",
  "subject": "Verify your email",
  "text": "Your verification code is 847291...",
  "code": "847291",
  "receivedAt": "2025-01-30T10:23:45.000Z"
}
```

### List Local Inboxes

```bash
aimailbox inboxes
```

### Delete Inbox

```bash
aimailbox delete <inbox>
aimailbox delete <inbox> --force  # Skip confirmation
```

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |
| `--code-only` | Output only the verification code |
| `--latest` | Read the most recent message |
| `-f, --force` | Skip confirmation prompts |
| `-l, --limit <n>` | Number of messages to list (default: 20) |
| `-t, --token <token>` | Use specific auth token |

## Programmatic Usage

```javascript
const { execSync } = require('child_process');

// Create inbox
const inbox = JSON.parse(
  execSync('aimailbox create --json', { encoding: 'utf-8' })
);
console.log(inbox.email);  // x7k2m@aimailbox.dev

// Get verification code
const code = execSync(
  `aimailbox read ${inbox.id} --latest --code-only`,
  { encoding: 'utf-8' }
).trim();
console.log(code);  // 847291
```

## Token Storage

Tokens are stored locally at `~/.aimailbox/tokens.json`. The token is required to access inbox messages and cannot be recovered if lost.

## License

MIT
