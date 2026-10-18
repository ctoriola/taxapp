import { createHash, timingSafeEqual } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

// The admin signs in with ADMIN_EMAIL / ADMIN_PASSWORD (Vercel environment variables) and gets an
// 8-hour session in an HttpOnly cookie. The signing secret is derived from those credentials and
// the service account key, so changing the password signs out every existing session.

export const SESSION_COOKIE = 'vatclear_admin';
const SESSION_HOURS = 8;

export interface AdminConfig {
  email: string;
  password: string;
  secretMaterial: string; // ADMIN_SESSION_SECRET or the service account private key
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

// Compares hashes so neither the length nor the content of the real value leaks through timing
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export function credentialsMatch(config: AdminConfig, email: string, password: string): boolean {
  const emailOk = safeEqual(config.email.trim().toLowerCase(), email.trim().toLowerCase());
  const passwordOk = safeEqual(config.password, password);
  return emailOk && passwordOk;
}

function secretKey(config: AdminConfig): Uint8Array {
  return new Uint8Array(sha256(`vatclear-admin|${config.email.toLowerCase()}|${config.password}|${config.secretMaterial}`));
}

export async function createSessionToken(config: AdminConfig, now = Date.now()): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(config.email.toLowerCase())
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + SESSION_HOURS * 3600)
    .sign(secretKey(config));
}

export async function verifySessionToken(config: AdminConfig, token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey(config), { algorithms: ['HS256'] });
    return payload.role === 'admin' && payload.sub === config.email.toLowerCase();
  } catch {
    return false;
  }
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
