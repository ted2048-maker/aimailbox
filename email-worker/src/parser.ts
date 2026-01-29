import PostalMime from 'postal-mime';

export interface ParsedEmail {
  from: {
    text: string;
    value: Array<{ name: string; address: string }>;
  };
  to: {
    text: string;
    value: Array<{ name: string; address: string }>;
  };
  subject: string;
  text: string;
  html: string;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
  }>;
}

export async function parseEmail(rawEmail: string): Promise<ParsedEmail> {
  const parser = new PostalMime();
  const parsed = await parser.parse(rawEmail);

  return {
    from: {
      text: parsed.from?.address || '',
      value: parsed.from
        ? [{ name: parsed.from.name || '', address: parsed.from.address || '' }]
        : [],
    },
    to: {
      text: Array.isArray(parsed.to) ? parsed.to.map((t) => t.address).join(', ') : '',
      value: Array.isArray(parsed.to)
        ? parsed.to.map((t) => ({ name: t.name || '', address: t.address || '' }))
        : [],
    },
    subject: parsed.subject || '',
    text: parsed.text || '',
    html: parsed.html || '',
    attachments: (parsed.attachments || []).map((att) => {
      let size = 0;
      if (att.content) {
        size = typeof att.content === 'string' ? att.content.length : att.content.byteLength;
      }
      return {
        filename: att.filename || 'unnamed',
        mimeType: att.mimeType || 'application/octet-stream',
        size,
      };
    }),
  };
}
