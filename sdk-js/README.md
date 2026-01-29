# aimailbox-sdk

**JavaScript SDK for AIMailbox** - Permissionless email inbox for AI agents and web applications.

## Installation

### npm / yarn / pnpm

```bash
npm install aimailbox-sdk
```

### Browser (CDN)

```html
<script src="https://unpkg.com/aimailbox-sdk"></script>
```

## Quick Start

### ES Modules (Node.js / Bundlers)

```javascript
import { AIMailbox } from 'aimailbox-sdk';

const client = new AIMailbox();

// Create inbox
const inbox = await client.createInbox();
console.log(`Email: ${inbox.email}`);
console.log(`Token: ${inbox.token}`);

// Wait for verification code
const code = await client.waitForCode(inbox.id, inbox.token, {
  timeout: 120000, // 2 minutes
  onPoll: (n) => console.log(`Polling... (${n})`)
});

console.log(`Verification code: ${code}`);
```

### Browser (Script Tag)

```html
<script src="https://unpkg.com/aimailbox-sdk"></script>
<script>
  const client = new AIMailbox.AIMailbox();

  async function getVerificationCode() {
    const inbox = await client.createInbox();
    document.getElementById('email').textContent = inbox.email;

    // Use this email for registration, then wait for code
    const code = await client.waitForCode(inbox.id, inbox.token);
    document.getElementById('code').textContent = code;
  }
</script>
```

## API Reference

### `new AIMailbox(options?)`

Create a new client instance.

```javascript
const client = new AIMailbox({
  baseUrl: 'https://api.aimailbox.dev', // Optional: custom API URL
  timeout: 30000 // Optional: request timeout in ms
});
```

### `client.createInbox()`

Create a new inbox. Returns email address and authentication token.

```javascript
const inbox = await client.createInbox();
// {
//   id: 'abc123',
//   email: 'abc123@aimailbox.dev',
//   token: '...',
//   createdAt: '2025-01-30T...'
// }
```

### `client.listMessages(inboxId, token, limit?, offset?)`

List messages in an inbox.

```javascript
const result = await client.listMessages(inbox.id, inbox.token);
// {
//   messages: [{ id, from, subject, timestamp, hasCode }, ...],
//   pagination: { total, limit, offset, hasMore }
// }
```

### `client.readMessage(inboxId, messageId, token)`

Read a specific message.

```javascript
const msg = await client.readMessage(inbox.id, msgId, inbox.token);
// {
//   id, from, fromName, to, subject, text, html,
//   code: { code: '123456', type: 'numeric', confidence: 0.95 },
//   receivedAt: '...'
// }
```

### `client.readLatestMessage(inboxId, token)`

Read the most recent message.

```javascript
const msg = await client.readLatestMessage(inbox.id, inbox.token);
```

### `client.waitForCode(inboxId, token, options?)`

Poll inbox until a verification code arrives.

```javascript
const code = await client.waitForCode(inbox.id, inbox.token, {
  timeout: 300000,  // Max wait time (default: 5 min)
  interval: 5000,   // Poll interval (default: 5 sec)
  onPoll: (n) => {} // Callback for each poll
});
```

### `client.createAndWaitForCode(options?)`

Convenience method: create inbox and wait for code.

```javascript
const { inbox, code } = await client.createAndWaitForCode({
  timeout: 120000
});
console.log(`Email: ${inbox.email}, Code: ${code}`);
```

### `client.deleteInbox(inboxId, token)`

Delete an inbox and all messages.

```javascript
await client.deleteInbox(inbox.id, inbox.token);
```

## TypeScript

Full TypeScript support with type definitions included:

```typescript
import { AIMailbox, Inbox, Message, VerificationCode } from 'aimailbox-sdk';

const client = new AIMailbox();
const inbox: Inbox = await client.createInbox();
```

## Use Cases

### Email Verification Flow

```javascript
const client = new AIMailbox();

// 1. Create inbox
const inbox = await client.createInbox();

// 2. Use email for registration
await registerOnWebsite(inbox.email);

// 3. Wait for verification code
const code = await client.waitForCode(inbox.id, inbox.token, {
  timeout: 120000
});

// 4. Complete verification
await submitVerificationCode(code);

// 5. Clean up (optional)
await client.deleteInbox(inbox.id, inbox.token);
```

### Browser Automation (Playwright/Puppeteer)

```javascript
import { AIMailbox } from 'aimailbox-sdk';
import { chromium } from 'playwright';

const client = new AIMailbox();
const browser = await chromium.launch();
const page = await browser.newPage();

// Create inbox
const inbox = await client.createInbox();

// Fill registration form
await page.goto('https://example.com/register');
await page.fill('#email', inbox.email);
await page.click('#submit');

// Wait for verification code
const code = await client.waitForCode(inbox.id, inbox.token);

// Enter verification code
await page.fill('#verification-code', code);
await page.click('#verify');
```

## License

MIT
