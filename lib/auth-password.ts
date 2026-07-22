import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

export async function hashParticipantPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyParticipantPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/** Case-fold for display-name matching within an event. */
export function normalizeParticipantName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
