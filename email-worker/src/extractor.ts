export interface ExtractedCode {
  code: string;
  type: 'numeric' | 'alphanumeric' | 'unknown';
  confidence: number;
}

export function extractVerificationCode(content: string): ExtractedCode | null {
  // Strip HTML tags
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

  // Verification code patterns (ordered by priority)
  const patterns: Array<{
    regex: RegExp;
    type: 'numeric' | 'alphanumeric';
    confidence: number;
  }> = [
    // Patterns with explicit verification code mention
    {
      regex: /(?:verification code|verify code|验证码|code|码)[:\s]*([0-9]{4,8})/gi,
      type: 'numeric',
      confidence: 0.95,
    },
    {
      regex: /(?:verification code|verify code|验证码|code|码)[:\s]*([A-Z0-9]{4,8})/gi,
      type: 'alphanumeric',
      confidence: 0.9,
    },
    // OTP patterns
    {
      regex: /(?:otp|one.?time.?password)[:\s]*([0-9]{4,8})/gi,
      type: 'numeric',
      confidence: 0.95,
    },
    // PIN patterns
    {
      regex: /(?:pin|PIN)[:\s]*([0-9]{4,6})/gi,
      type: 'numeric',
      confidence: 0.85,
    },
    // Standalone 6-digit numbers (common verification code length)
    {
      regex: /\b([0-9]{6})\b/g,
      type: 'numeric',
      confidence: 0.6,
    },
  ];

  for (const pattern of patterns) {
    const match = pattern.regex.exec(text);
    if (match && match[1]) {
      return {
        code: match[1],
        type: pattern.type,
        confidence: pattern.confidence,
      };
    }
    // Reset regex lastIndex
    pattern.regex.lastIndex = 0;
  }

  return null;
}
