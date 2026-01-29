// Generate random inbox ID
// Uses lowercase letters and numbers, avoiding confusing characters (0/O, 1/l)
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

const MIN_LENGTH = 6;
const MAX_LENGTH = 12;
const MAX_RETRIES_PER_LENGTH = 5;

export function generateRandomId(length: number): string {
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += ALPHABET[randomValues[i] % ALPHABET.length];
  }

  return result;
}

/**
 * Generate a unique inbox ID that doesn't exist in KV
 * Starts with MIN_LENGTH, automatically expands if too many collisions
 */
export async function generateUniqueInboxId(
  kv: KVNamespace,
  checkExists: (id: string) => Promise<boolean>
): Promise<string> {
  let length = MIN_LENGTH;

  while (length <= MAX_LENGTH) {
    // Try multiple times at current length
    for (let attempt = 0; attempt < MAX_RETRIES_PER_LENGTH; attempt++) {
      const id = generateRandomId(length);
      const exists = await checkExists(id);

      if (!exists) {
        return id;
      }

      console.log(`ID collision: ${id}, attempt ${attempt + 1}/${MAX_RETRIES_PER_LENGTH}`);
    }

    // Too many collisions at this length, increase
    console.log(`Too many collisions at length ${length}, expanding to ${length + 1}`);
    length++;
  }

  // Fallback: use timestamp + random suffix (should never happen in practice)
  const timestamp = Date.now().toString(36);
  const suffix = generateRandomId(4);
  return `${timestamp}${suffix}`;
}
