<p align="center">
  <img src="logo.svg" alt="AIMailbox Logo" width="120" height="120">
</p>

<h1 align="center">AIMailbox</h1>

<p align="center"><strong>An inbox for your agent, no questions asked.</strong></p>

*Permissionless email for AI agents. No signup, no KYC, no wait.*

## Why This Exists

AI agents often need to receive emails for:
- Email verification codes during account registration
- Password reset links
- Confirmation emails
- Notifications from services

AIMailbox provides disposable inboxes that AI agents can create and use instantly, with automatic verification code extraction.

**[Try the Web Demo →](https://aimailbox.pinit.eth.limo)**

---

## Quick Start for AI Agents

### Option 1: Node.js (npm)

```bash
# Install globally
npm install -g aimailbox

# Create a new inbox (no registration required)
aimailbox create

# Check for new messages
aimailbox list <inbox-id>

# Read a message and extract verification code
aimailbox read <inbox-id> 1 --code-only
```

### Option 2: Python (pip)

```bash
# Install globally
pip install aimailbox

# Create a new inbox (no registration required)
aimailbox create

# Check for new messages
aimailbox list <inbox-id>

# Read a message and extract verification code
aimailbox read <inbox-id> 1 --code-only
```

---

## Complete Usage Guide

### 1. Create an Inbox

```bash
aimailbox create
```

Output:
```
✓ Inbox created successfully!

  Email:    x7k2m@aimailbox.dev
  Inbox ID: x7k2m
  Token:    e5fab46369ec59ac4361b87cf5b7e5c5...

Token has been saved locally. Keep it safe - it cannot be recovered!
```

**Important:** The token is stored locally in `~/.aimailbox/tokens.json`. You need this token to access the inbox. If lost, the inbox becomes inaccessible.

### 2. Use the email address

Use the generated email (e.g., `x7k2m@aimailbox.dev`) for:
- Service registrations
- Account verifications
- Any system that sends confirmation emails

### 3. Check for Messages

```bash
# List all messages in inbox
aimailbox list x7k2m

# Or use full email address
aimailbox list x7k2m@aimailbox.dev
```

Output:
```
Inbox: x7k2m@aimailbox.dev
3 message(s)

 1. [Today 10:23] noreply@github.com | Verify your email [CODE]
 2. [Today 10:25] no-reply@openai.com | Your verification code [CODE]
 3. [Yesterday 15:30] support@stripe.com | Confirm your email
```

The `[CODE]` indicator shows that a verification code was detected in that message.

### 4. Read Messages

```bash
# Read message #1
aimailbox read x7k2m 1

# Read the latest message
aimailbox read x7k2m --latest

# Get ONLY the verification code (best for automation)
aimailbox read x7k2m 1 --code-only
# Output: 847291

# Get message as JSON (for programmatic use)
aimailbox read x7k2m 1 --json
```

JSON output format:
```json
{
  "from": "noreply@github.com",
  "subject": "Verify your email",
  "text": "Your verification code is 847291...",
  "code": "847291",
  "receivedAt": "2025-01-30T10:23:45.000Z"
}
```

### 5. Delete Inbox (Optional)

```bash
# Delete inbox and all messages
aimailbox delete x7k2m

# Skip confirmation prompt
aimailbox delete x7k2m --force
```

---

## AI Agent Integration Patterns

### Pattern 1: Wait for Verification Code

```bash
# 1. Create inbox
EMAIL=$(aimailbox create --json | jq -r '.email')

# 2. Use $EMAIL for registration...

# 3. Wait and poll for verification code
for i in {1..30}; do
  CODE=$(aimailbox read $EMAIL --latest --code-only 2>/dev/null)
  if [ -n "$CODE" ]; then
    echo "Verification code: $CODE"
    break
  fi
  sleep 10
done
```

### Pattern 2: Python Integration

```python
import subprocess
import json
import time

def create_inbox():
    result = subprocess.run(
        ["aimailbox", "create", "--json"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def get_verification_code(inbox_id, timeout=300):
    start = time.time()
    while time.time() - start < timeout:
        result = subprocess.run(
            ["aimailbox", "read", inbox_id, "--latest", "--code-only"],
            capture_output=True, text=True
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
        time.sleep(10)
    return None

# Usage
inbox = create_inbox()
print(f"Use this email: {inbox['email']}")
# ... perform registration with inbox['email'] ...
code = get_verification_code(inbox['id'])
print(f"Verification code: {code}")
```

### Pattern 3: Node.js Integration

```javascript
const { execSync } = require('child_process');

function createInbox() {
  const output = execSync('aimailbox create --json', { encoding: 'utf-8' });
  return JSON.parse(output);
}

function getVerificationCode(inboxId, timeoutMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const code = execSync(`aimailbox read ${inboxId} --latest --code-only`, {
        encoding: 'utf-8'
      }).trim();
      if (code) return code;
    } catch (e) {
      // No message yet
    }
    execSync('sleep 10');
  }
  return null;
}

// Usage
const inbox = createInbox();
console.log(`Use this email: ${inbox.email}`);
// ... perform registration with inbox.email ...
const code = getVerificationCode(inbox.id);
console.log(`Verification code: ${code}`);
```

---

## Command Reference

| Command | Description |
|---------|-------------|
| `aimailbox create` | Create a new inbox |
| `aimailbox inboxes` | List all locally stored inboxes |
| `aimailbox list <inbox>` | List messages in an inbox |
| `aimailbox read <inbox> <n>` | Read message #n (1-indexed) |
| `aimailbox read <inbox> --latest` | Read the most recent message |
| `aimailbox read <inbox> --code-only` | Output only the verification code |
| `aimailbox read <inbox> --json` | Output message as JSON |
| `aimailbox delete <inbox>` | Delete inbox and all messages |

### Common Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format (for `create`, `list`, `read`, `inboxes`) |
| `--code-only` | Output only the extracted verification code |
| `--latest` | Read the most recent message |
| `-f, --force` | Skip confirmation prompts |
| `-t, --token <token>` | Use specific auth token (instead of stored one) |

---

## How It Works

1. **Inbox Creation**: Generate a random inbox ID (e.g., `x7k2m`) and authentication token
2. **Email reception**: Emails sent to `<id>@aimailbox.dev` are received by Cloudflare Email Workers
3. **Code Extraction**: Verification codes are automatically extracted using pattern matching
4. **Secure Access**: Only the token holder can read messages (token is hashed server-side)

### Security Model

- **Token-based authentication**: 256-bit random token, SHA-256 hashed on server
- **No registration**: Inbox IDs are random, unlinkable to any identity
- **Receive-only**: Cannot send emails (prevents spam abuse)
- **Auto-expiration**: Messages are deleted after 7 days

---

## Supported Verification Code Formats

The system automatically extracts codes from common formats:

- `Your code is 123456`
- `Verification code: 123456`
- `Code: 123456`
- `OTP: 123456`
- `PIN: 1234`
- 4-8 digit numeric codes
- Alphanumeric codes (e.g., `ABC123`)

---

## Troubleshooting

### "No messages yet"
- Email delivery can take 10-60 seconds
- Some services have delays; wait and retry

### "No verification code found"
- The code format may not be recognized
- Use `--json` to see full message content and extract manually

### "Authentication required"
- Token may be missing or invalid
- Check `~/.aimailbox/tokens.json` for stored tokens
- Provide token manually with `-t <token>`

### "Inbox not found"
- Inbox may have been deleted or expired
- Create a new inbox with `aimailbox create`

---

## Self-Hosting

To run your own AIMailbox instance, see the `/api-worker` and `/email-worker` directories. Requires:
- Cloudflare account with email routing enabled
- Custom domain configured in Cloudflare
- D1 database for storage

---

## License

MIT
