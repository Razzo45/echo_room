export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function stripControlCharacters(value: string): string {
  // Remove most control chars except common whitespace (\n, \r, \t)
  return value.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '');
}

export function sanitizeText(value: string): string {
  const normalized = normalizeWhitespace(value);
  return stripControlCharacters(normalized);
}

