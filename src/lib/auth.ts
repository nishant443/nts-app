import "server-only";

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A bcrypt comparison against a throwaway hash. Called when a login is
 * attempted for an unknown email so that the response time does not reveal
 * whether the address exists.
 */
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7RG.d/FhBQtEB5rnrbYNhOKRt7yFRsC";

export async function fakePasswordCheck(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}

/** Readable temporary password for a newly created employee account. */
export function generateTemporaryPassword(): string {
  const words = ["Spindle", "Servo", "Turret", "Chuck", "Axis", "Coolant"];
  const word = words[Math.floor(Math.random() * words.length)]!;
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${word}@${digits}`;
}
