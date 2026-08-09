import argon2 from 'argon2';

/**
 * Hashes a password using Argon2id — the recommended variant.
 * Never store or log the plain-text password.
 */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 4
  });
}

/**
 * Verifies a candidate password against a stored Argon2id hash.
 * Returns false if the hash format is invalid rather than throwing.
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
