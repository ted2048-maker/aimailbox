/**
 * End-to-End Test: Real Email Flow
 * Tests the actual email receiving and code extraction
 *
 * Run with: npx tsx test-e2e.ts
 */

import { AIMailbox } from './src/index';

async function testRealEmailFlow() {
  console.log('\n========================================');
  console.log('E2E Test: Real Email Flow');
  console.log('========================================\n');

  const client = new AIMailbox();

  // 1. Create inbox
  console.log('1. Creating inbox...');
  const inbox = await client.createInbox();
  console.log(`   Email: ${inbox.email}`);
  console.log(`   ID: ${inbox.id}`);
  console.log(`   Token: ${inbox.token.substring(0, 16)}...`);

  // 2. Check for existing messages (should be empty)
  console.log('\n2. Checking initial state...');
  const initial = await client.listMessages(inbox.id, inbox.token);
  console.log(`   Messages: ${initial.messages.length} (expected: 0)`);

  if (initial.messages.length !== 0) {
    console.log('   WARNING: Inbox not empty!');
  }

  // 3. Test with existing inbox that has messages
  console.log('\n3. Testing with existing inbox (tduabu)...');

  // Check if we can read from an inbox we don't have token for
  try {
    await client.listMessages('tduabu', 'fake_token');
    console.log('   ERROR: Should have failed with fake token');
  } catch (e) {
    console.log('   ✓ Correctly rejected fake token');
  }

  // 4. Test readLatestMessage
  console.log('\n4. Testing readLatestMessage on new inbox...');
  const latest = await client.readLatestMessage(inbox.id, inbox.token);
  if (latest === null) {
    console.log('   ✓ Correctly returned null for empty inbox');
  } else {
    console.log('   Message found:', latest.subject);
  }

  // 5. Test waitForCode with short timeout
  console.log('\n5. Testing waitForCode (short timeout)...');
  let pollCount = 0;
  const code = await client.waitForCode(inbox.id, inbox.token, {
    timeout: 3000,  // 3 seconds
    interval: 1000, // 1 second
    onPoll: (n) => {
      pollCount = n;
      process.stdout.write(`   Polling attempt ${n}...\r`);
    }
  });
  console.log(`\n   Poll attempts: ${pollCount}`);
  console.log(`   Code found: ${code ?? 'null (expected - no email sent)'}`);

  // 6. Test createAndWaitForCode
  console.log('\n6. Testing createAndWaitForCode...');
  const result = await client.createAndWaitForCode({
    timeout: 2000,
    interval: 500,
    onPoll: (n) => process.stdout.write(`   Attempt ${n}...\r`)
  });
  console.log(`\n   New inbox: ${result.inbox.email}`);
  console.log(`   Code: ${result.code ?? 'null (expected)'}`);

  // 7. Clean up - delete test inboxes
  console.log('\n7. Cleaning up...');
  await client.deleteInbox(inbox.id, inbox.token);
  console.log(`   Deleted: ${inbox.id}`);
  await client.deleteInbox(result.inbox.id, result.inbox.token);
  console.log(`   Deleted: ${result.inbox.id}`);

  // 8. Verify deletion
  console.log('\n8. Verifying deletion...');
  try {
    await client.listMessages(inbox.id, inbox.token);
    console.log('   ERROR: Inbox still accessible after deletion!');
  } catch (e) {
    console.log('   ✓ Inbox correctly deleted');
  }

  console.log('\n========================================');
  console.log('E2E Test Complete');
  console.log('========================================\n');
}

// Test browser compatibility (check exports)
function testBrowserExports() {
  console.log('========================================');
  console.log('Browser Compatibility Check');
  console.log('========================================\n');

  // Check that all expected exports exist
  const exports = require('./dist/index.js');

  const expectedExports = [
    'AIMailbox',
    'APIError',
    'default'
  ];

  for (const name of expectedExports) {
    if (name in exports) {
      console.log(`  ✓ Export '${name}' exists`);
    } else {
      console.log(`  ✗ Export '${name}' missing!`);
    }
  }

  // Check class methods
  const client = new exports.AIMailbox();
  const methods = [
    'createInbox',
    'listMessages',
    'readMessage',
    'readLatestMessage',
    'deleteInbox',
    'waitForCode',
    'createAndWaitForCode'
  ];

  console.log('\n  Methods on AIMailbox:');
  for (const method of methods) {
    if (typeof client[method] === 'function') {
      console.log(`    ✓ ${method}()`);
    } else {
      console.log(`    ✗ ${method}() missing!`);
    }
  }

  console.log('');
}

// Run
testBrowserExports();
testRealEmailFlow().catch(console.error);
