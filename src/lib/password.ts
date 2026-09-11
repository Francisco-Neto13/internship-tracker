import { hash, verify } from "@node-rs/argon2";

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
