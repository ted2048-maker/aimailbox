// Generate a random token (32 bytes = 64 hex chars)
export function generateToken(): string {
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Hash token using SHA-256
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Verify token against stored hash
export async function verifyToken(token: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashToken(token);
  return inputHash === storedHash;
}

// Extract token from request (Authorization header or query param)
export function extractToken(request: Request): string | null {
  // Try Authorization header first: "Bearer <token>"
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Fall back to query parameter
  const url = new URL(request.url);
  return url.searchParams.get('token');
}
