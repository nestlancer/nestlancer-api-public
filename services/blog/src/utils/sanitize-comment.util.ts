import { BadRequestException } from '@nestjs/common';

/**
 * Comments are plain text. Strip markup so stored HTML cannot be replayed as XSS
 * if a client ever renders the body unsafely.
 */
export function sanitizeCommentContent(raw: string): string {
  const stripped = String(raw ?? '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/<[^>]*$/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) {
    throw new BadRequestException('Comment cannot be empty');
  }

  return stripped.slice(0, 2000);
}
