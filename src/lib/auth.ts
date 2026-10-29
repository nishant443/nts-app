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

const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7RG.d/FhBQtEB5rnrbYNhOKRt7yFRsC";

export async function fakePasswordCheck(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}
