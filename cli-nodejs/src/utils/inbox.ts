/**
 * Extract inbox ID from either:
 * - Just the ID: "tuft9u"
 * - Full email: "tuft9u@aimailbox.dev"
 *
 * Throws Error if the input is empty or uses wrong domain.
 */
export function parseInboxId(input: string): string {
  const trimmed = input.trim().toLowerCase();

  if (!trimmed) {
    throw new Error('Inbox ID cannot be empty');
  }

  // If it contains @, extract the part before @
  if (trimmed.includes('@')) {
    const [inboxId, domain] = trimmed.split('@');

    if (!inboxId) {
      throw new Error('Inbox ID cannot be empty');
    }

    if (domain && domain !== 'aimailbox.dev') {
      throw new Error(`Invalid domain '${domain}'. Only @aimailbox.dev is supported`);
    }

    return inboxId;
  }

  return trimmed;
}
