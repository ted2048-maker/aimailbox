/**
 * Extract inbox ID from either:
 * - Just the ID: "tuft9u"
 * - Full email: "tuft9u@aimailbox.dev"
 */
export function parseInboxId(input: string): string {
  const trimmed = input.trim().toLowerCase();

  // If it contains @, extract the part before @
  if (trimmed.includes('@')) {
    return trimmed.split('@')[0];
  }

  return trimmed;
}
