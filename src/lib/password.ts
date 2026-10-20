import { randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

// Unambiguous characters only: the temporary password is read aloud or copied by hand
// when the administrator hands it over (no 0/O, 1/l/I)
const TEMPORARY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const TEMPORARY_LENGTH = 16;

/**
 * Temporary password issued by the administrator (RF002). randomInt draws from the
 * operating system CSPRNG without modulo bias. 16 characters stay above the 15-character
 * floor of NIST SP 800-63B-4 §3.1.1.2 for single-factor passwords.
 */
export function generateTemporaryPassword(): string {
  let password = "";
  for (let index = 0; index < TEMPORARY_LENGTH; index++) {
    password += TEMPORARY_ALPHABET[randomInt(TEMPORARY_ALPHABET.length)];
  }
  return password;
}

// Argon2id with the OWASP baseline (19 MiB, 2 iterations, 1 lane). Parameters are
// encoded in each hash, so raising them later does not invalidate stored passwords.
const OPTIONS = {
  algorithm: 2, // Algorithm.Argon2id; the const enum is not importable under isolatedModules
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword({ hash: stored, password }: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    // Malformed or foreign hash format: treat as a failed login, never as a crash
    return false;
  }
}
