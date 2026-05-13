// Server-only helpers for the internal auth system.
import bcrypt from "bcryptjs";

export const SESSION_CONFIG = {
  password:
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "dev-only-fallback-please-set-SESSION_SECRET-min-32-chars",
  name: "planeja_session",
  maxAge: 60 * 60 * 24 * 7,
  cookie: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
};

export type SessionData = { userId?: string };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 6) return "A senha deve ter ao menos 6 caracteres.";
  if (password === "admin") return "Escolha uma senha diferente do padrão.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    return "A senha deve conter letras e números.";
  return null;
}
