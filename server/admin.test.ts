import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdminConfig,
  createSessionToken,
  credentialsMatch,
  readCookie,
  sessionCookie,
  verifySessionToken,
} from './adminSession';
import { lagosDayKey, lastDayKeys, weekStart } from './days';
import { handleAdmin, resetLoginLimits } from './admin';
import { handleTrack } from './track';
import type { AdminServices } from './firebaseAdmin';

const config: AdminConfig = { email: 'Boss@Example.com', password: 'correct horse', secretMaterial: 'secret' };
const services = {} as AdminServices; // the guard paths below never reach Firebase

const deps = { config, services, apiKey: 'key', fetch: vi.fn() as unknown as typeof fetch };
const call = (body: unknown, cookie: string | null = null, ip = '1.1.1.1') =>
  handleAdmin({ cookie, ip, body: JSON.stringify(body) }, deps);

describe('admin session', () => {
  it('matches credentials case-insensitively on email only', () => {
    expect(credentialsMatch(config, ' boss@example.com ', 'correct horse')).toBe(true);
    expect(credentialsMatch(config, 'boss@example.com', 'Correct horse')).toBe(false);
    expect(credentialsMatch(config, 'other@example.com', 'correct horse')).toBe(false);
  });

  it('issues tokens that expire after 8 hours', async () => {
    const now = Date.now();
    const token = await createSessionToken(config, now);
    expect(await verifySessionToken(config, token)).toBe(true);
    const old = await createSessionToken(config, now - 9 * 3600_000);
    expect(await verifySessionToken(config, old)).toBe(false);
  });

  it('invalidates sessions when the password changes', async () => {
    const token = await createSessionToken(config);
    expect(await verifySessionToken({ ...config, password: 'new password' }, token)).toBe(false);
  });

  it('sets a locked-down cookie and reads it back', () => {
    const cookie = sessionCookie('abc');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/admin');
    expect(readCookie('a=1; vatclear_admin=abc; b=2', 'vatclear_admin')).toBe('abc');
    expect(readCookie(null, 'vatclear_admin')).toBeNull();
  });
});

describe('Lagos days', () => {
  it('rolls over at midnight Lagos time (23:00 UTC)', () => {
    expect(lagosDayKey(Date.parse('2026-10-18T22:59:00Z'))).toBe('2026-10-18');
    expect(lagosDayKey(Date.parse('2026-10-18T23:00:00Z'))).toBe('2026-10-19');
  });

  it('starts weeks on Monday', () => {
    expect(weekStart('2026-10-18')).toBe('2026-10-12'); // Sunday
    expect(weekStart('2026-10-19')).toBe('2026-10-19'); // Monday
  });

  it('lists the last N days ending today', () => {
    const keys = lastDayKeys(3, Date.parse('2026-03-01T12:00:00Z'));
    expect(keys).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
  });
});

describe('handleAdmin guards', () => {
  beforeEach(() => resetLoginLimits());

  it('reports missing setup', async () => {
    const res = await handleAdmin({ cookie: null, ip: 'x', body: '{}' }, { ...deps, config: null });
    expect(res.status).toBe(503);
  });

  it('rejects every action without a session', async () => {
    for (const action of ['session', 'overview', 'users', 'user', 'setDisabled', 'sendPasswordReset', 'deleteInvoice']) {
      expect((await call({ action, uid: 'u1', invoiceId: 'i1', disabled: true })).status).toBe(401);
    }
    expect((await call({ action: 'deleteInvoice' }, 'vatclear_admin=forged.token.value')).status).toBe(401);
  });

  it('signs in with the right credentials and accepts the cookie', async () => {
    expect((await call({ action: 'login', email: 'boss@example.com', password: 'nope' })).status).toBe(401);
    const res = await call({ action: 'login', email: 'boss@example.com', password: 'correct horse' });
    expect(res.status).toBe(200);
    const token = res.setCookie!.split(';')[0];
    const session = await call({ action: 'session' }, token);
    expect(session).toMatchObject({ status: 200, body: { email: 'Boss@Example.com' } });
  });

  it('locks out an IP after 10 failed attempts', async () => {
    for (let i = 0; i < 10; i++) await call({ action: 'login', email: 'x@y.z', password: 'bad' }, null, '9.9.9.9');
    const res = await call({ action: 'login', email: 'boss@example.com', password: 'correct horse' }, null, '9.9.9.9');
    expect(res.status).toBe(429);
    // other addresses are unaffected
    expect((await call({ action: 'login', email: 'boss@example.com', password: 'correct horse' })).status).toBe(200);
  });

  it('clears the cookie on logout', async () => {
    const res = await call({ action: 'logout' });
    expect(res.setCookie).toContain('Max-Age=0');
  });
});

describe('handleTrack validation', () => {
  it('is a no-op when Firebase Admin is not configured', async () => {
    expect(await handleTrack('{"type":"visit","visitorId":"abcdefgh"}', null)).toBe(204);
  });

  it('rejects bad input before touching the database', async () => {
    expect(await handleTrack('not json', services)).toBe(400);
    expect(await handleTrack('{"type":"visit","visitorId":"../evil"}', services)).toBe(400);
    expect(await handleTrack('{"type":"visit"}', services)).toBe(400);
  });
});
