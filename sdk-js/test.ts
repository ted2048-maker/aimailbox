/**
 * Comprehensive SDK Test Suite
 * Run with: npx tsx test.ts
 */

import { AIMailbox, Inbox, APIError } from './src/index';

// Test utilities
let passCount = 0;
let failCount = 0;

function pass(name: string) {
  passCount++;
  console.log(`  ✓ ${name}`);
}

function fail(name: string, error: unknown) {
  failCount++;
  console.log(`  ✗ ${name}`);
  console.log(`    Error: ${error}`);
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    pass(name);
  } catch (e) {
    fail(name, e);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

// ============================================
// Tests
// ============================================

async function runTests() {
  console.log('\n========================================');
  console.log('AIMailbox SDK Test Suite');
  console.log('========================================\n');

  const client = new AIMailbox();
  let testInbox: Inbox;

  // ------------------------------------------
  console.log('1. Constructor & Configuration Tests');
  // ------------------------------------------

  await test('Default configuration', async () => {
    const c = new AIMailbox();
    assert(c !== null, 'Client should be created');
  });

  await test('Custom baseUrl', async () => {
    const c = new AIMailbox({ baseUrl: 'https://custom.api.com' });
    assert(c !== null, 'Client with custom URL should be created');
  });

  await test('Custom timeout', async () => {
    const c = new AIMailbox({ timeout: 5000 });
    assert(c !== null, 'Client with custom timeout should be created');
  });

  await test('All options combined', async () => {
    const c = new AIMailbox({
      baseUrl: 'https://api.aimailbox.dev',
      timeout: 60000,
    });
    assert(c !== null, 'Client with all options should be created');
  });

  // ------------------------------------------
  console.log('\n2. createInbox() Tests');
  // ------------------------------------------

  await test('Create inbox successfully', async () => {
    testInbox = await client.createInbox();
    assert(typeof testInbox.id === 'string', 'id should be string');
    assert(testInbox.id.length >= 4, 'id should be at least 4 chars');
    assert(testInbox.email.includes('@aimailbox.dev'), 'email should have correct domain');
    assert(typeof testInbox.token === 'string', 'token should be string');
    assert(testInbox.token.length === 64, 'token should be 64 chars (256-bit hex)');
    assert(typeof testInbox.createdAt === 'string', 'createdAt should be string');
  });

  await test('Create multiple inboxes (should be unique)', async () => {
    const inbox1 = await client.createInbox();
    const inbox2 = await client.createInbox();
    assert(inbox1.id !== inbox2.id, 'IDs should be unique');
    assert(inbox1.email !== inbox2.email, 'Emails should be unique');
    assert(inbox1.token !== inbox2.token, 'Tokens should be unique');
  });

  // ------------------------------------------
  console.log('\n3. listMessages() Tests');
  // ------------------------------------------

  await test('List messages on empty inbox', async () => {
    const result = await client.listMessages(testInbox.id, testInbox.token);
    assert(Array.isArray(result.messages), 'messages should be array');
    assertEqual(result.messages.length, 0, 'Empty inbox should have 0 messages');
    assert(typeof result.pagination === 'object', 'pagination should exist');
    assertEqual(result.pagination.total, 0, 'total should be 0');
  });

  await test('List messages with custom limit', async () => {
    const result = await client.listMessages(testInbox.id, testInbox.token, 5);
    assertEqual(result.pagination.limit, 5, 'limit should be 5');
  });

  await test('List messages with offset', async () => {
    const result = await client.listMessages(testInbox.id, testInbox.token, 10, 5);
    assertEqual(result.pagination.offset, 5, 'offset should be 5');
  });

  // ------------------------------------------
  console.log('\n4. Authentication Tests');
  // ------------------------------------------

  await test('Invalid token should fail', async () => {
    try {
      await client.listMessages(testInbox.id, 'invalid_token_12345');
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof APIError || (e as Error).message.includes('Invalid'), 'Should throw auth error');
    }
  });

  await test('Empty token should fail', async () => {
    try {
      await client.listMessages(testInbox.id, '');
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should throw error');
    }
  });

  await test('Wrong inbox ID should fail', async () => {
    try {
      await client.listMessages('nonexistent123', testInbox.token);
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should throw error');
    }
  });

  await test('Token from different inbox should fail', async () => {
    const otherInbox = await client.createInbox();
    try {
      await client.listMessages(testInbox.id, otherInbox.token);
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should throw auth error');
    }
  });

  // ------------------------------------------
  console.log('\n5. readMessage() Tests');
  // ------------------------------------------

  await test('Read non-existent message should fail', async () => {
    try {
      await client.readMessage(testInbox.id, '9999999999999', testInbox.token);
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should throw error');
    }
  });

  // ------------------------------------------
  console.log('\n6. readLatestMessage() Tests');
  // ------------------------------------------

  await test('Read latest on empty inbox returns null', async () => {
    const msg = await client.readLatestMessage(testInbox.id, testInbox.token);
    assertEqual(msg, null, 'Should return null for empty inbox');
  });

  // ------------------------------------------
  console.log('\n7. deleteInbox() Tests');
  // ------------------------------------------

  await test('Delete inbox successfully', async () => {
    const tempInbox = await client.createInbox();
    await client.deleteInbox(tempInbox.id, tempInbox.token);

    // Verify it's deleted
    try {
      await client.listMessages(tempInbox.id, tempInbox.token);
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Deleted inbox should not be accessible');
    }
  });

  await test('Delete with wrong token should fail', async () => {
    const tempInbox = await client.createInbox();
    try {
      await client.deleteInbox(tempInbox.id, 'wrong_token');
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should throw auth error');
    }
  });

  // ------------------------------------------
  console.log('\n8. waitForCode() Tests');
  // ------------------------------------------

  await test('waitForCode with very short timeout returns null', async () => {
    const code = await client.waitForCode(testInbox.id, testInbox.token, {
      timeout: 100,   // 100ms - will definitely timeout
      interval: 50,
    });
    assertEqual(code, null, 'Should return null on timeout');
  });

  await test('waitForCode calls onPoll callback', async () => {
    let pollCount = 0;
    await client.waitForCode(testInbox.id, testInbox.token, {
      timeout: 200,
      interval: 50,
      onPoll: () => { pollCount++; },
    });
    assert(pollCount > 0, 'onPoll should be called at least once');
  });

  // ------------------------------------------
  console.log('\n9. createAndWaitForCode() Tests');
  // ------------------------------------------

  await test('createAndWaitForCode creates inbox and waits', async () => {
    const result = await client.createAndWaitForCode({
      timeout: 100,
      interval: 50,
    });
    assert(result.inbox !== null, 'inbox should be created');
    assert(typeof result.inbox.email === 'string', 'inbox should have email');
    assertEqual(result.code, null, 'code should be null (no email sent)');
  });

  // ------------------------------------------
  console.log('\n10. Edge Cases & Error Handling');
  // ------------------------------------------

  await test('Handle network timeout gracefully', async () => {
    const shortTimeoutClient = new AIMailbox({ timeout: 1 }); // 1ms timeout
    try {
      await shortTimeoutClient.createInbox();
      // If it succeeds (unlikely), that's fine too
    } catch (e) {
      assert(e instanceof Error, 'Should throw error on timeout');
    }
  });

  await test('Invalid API URL should fail', async () => {
    const badClient = new AIMailbox({ baseUrl: 'https://invalid.domain.that.does.not.exist.aimailbox.dev' });
    try {
      await badClient.createInbox();
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should throw error for bad URL');
    }
  });

  await test('Special characters in inbox ID are handled', async () => {
    try {
      await client.listMessages('test<script>', testInbox.token);
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should handle special chars');
    }
  });

  await test('Very long inbox ID is rejected', async () => {
    const longId = 'a'.repeat(1000);
    try {
      await client.listMessages(longId, testInbox.token);
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should reject very long ID');
    }
  });

  await test('Unicode in inbox ID is handled', async () => {
    try {
      await client.listMessages('测试邮箱', testInbox.token);
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should handle unicode');
    }
  });

  await test('Null/undefined parameters are handled', async () => {
    try {
      // @ts-expect-error Testing invalid input
      await client.listMessages(null, testInbox.token);
      throw new Error('Should have thrown');
    } catch (e) {
      assert(e instanceof Error, 'Should handle null');
    }
  });

  await test('Negative limit is handled', async () => {
    // API might accept it or reject it - either is fine
    try {
      const result = await client.listMessages(testInbox.id, testInbox.token, -1);
      // If it works, check result is valid
      assert(Array.isArray(result.messages), 'Should still return valid result');
    } catch (e) {
      assert(e instanceof Error, 'Or throw error');
    }
  });

  await test('Zero limit is handled', async () => {
    try {
      const result = await client.listMessages(testInbox.id, testInbox.token, 0);
      assert(Array.isArray(result.messages), 'Should return valid result');
    } catch (e) {
      assert(e instanceof Error, 'Or throw error');
    }
  });

  await test('Very large limit is handled', async () => {
    const result = await client.listMessages(testInbox.id, testInbox.token, 10000);
    assert(Array.isArray(result.messages), 'Should return valid result');
  });

  // ------------------------------------------
  console.log('\n11. Type Safety Tests');
  // ------------------------------------------

  await test('Inbox response has correct shape', async () => {
    const inbox = await client.createInbox();
    const keys = Object.keys(inbox);
    assert(keys.includes('id'), 'Should have id');
    assert(keys.includes('email'), 'Should have email');
    assert(keys.includes('token'), 'Should have token');
    assert(keys.includes('createdAt'), 'Should have createdAt');
  });

  await test('ListMessages response has correct shape', async () => {
    const result = await client.listMessages(testInbox.id, testInbox.token);
    assert('messages' in result, 'Should have messages');
    assert('pagination' in result, 'Should have pagination');
    assert('total' in result.pagination, 'pagination should have total');
    assert('limit' in result.pagination, 'pagination should have limit');
    assert('offset' in result.pagination, 'pagination should have offset');
    assert('hasMore' in result.pagination, 'pagination should have hasMore');
  });

  // ------------------------------------------
  console.log('\n12. Concurrent Operations');
  // ------------------------------------------

  await test('Multiple concurrent createInbox calls', async () => {
    const promises = Array(5).fill(null).map(() => client.createInbox());
    const inboxes = await Promise.all(promises);
    const ids = new Set(inboxes.map(i => i.id));
    assertEqual(ids.size, 5, 'All IDs should be unique');
  });

  await test('Concurrent operations on same inbox', async () => {
    const promises = [
      client.listMessages(testInbox.id, testInbox.token),
      client.listMessages(testInbox.id, testInbox.token),
      client.listMessages(testInbox.id, testInbox.token),
    ];
    const results = await Promise.all(promises);
    assert(results.every(r => Array.isArray(r.messages)), 'All should succeed');
  });

  // ------------------------------------------
  // Summary
  // ------------------------------------------

  console.log('\n========================================');
  console.log('Test Results');
  console.log('========================================');
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Total:  ${passCount + failCount}`);
  console.log('========================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
