import { describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { verifyFirebaseIdToken } from './firebaseAuth';

const PROJECT = 'taxapp-test';

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown>, opts: { iss?: string; aud?: string; sub?: string; exp?: string } = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(opts.iss ?? `https://securetoken.google.com/${PROJECT}`)
      .setAudience(opts.aud ?? PROJECT)
      .setSubject(opts.sub ?? 'user-123')
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? '1h')
      .sign(privateKey);
  return { keys, sign, otherKey: (await generateKeyPair('RS256')).privateKey };
}

describe('verifyFirebaseIdToken', () => {
  it('returns the uid for a valid token', async () => {
    const { keys, sign } = await setup();
    expect(await verifyFirebaseIdToken(await sign({}), PROJECT, keys)).toBe('user-123');
  });

  it('rejects tokens for another project, expired tokens and forged signatures', async () => {
    const { keys, sign, otherKey } = await setup();
    await expect(verifyFirebaseIdToken(await sign({}, { aud: 'someone-else' }), PROJECT, keys)).rejects.toThrow();
    await expect(verifyFirebaseIdToken(await sign({}, { iss: 'https://evil.example' }), PROJECT, keys)).rejects.toThrow();
    await expect(verifyFirebaseIdToken(await sign({}, { exp: '-1m' }), PROJECT, keys)).rejects.toThrow();
    const forged = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(`https://securetoken.google.com/${PROJECT}`).setAudience(PROJECT).setSubject('x').setExpirationTime('1h').sign(otherKey);
    await expect(verifyFirebaseIdToken(forged, PROJECT, keys)).rejects.toThrow();
  });

  it('refuses to run without a project ID', async () => {
    const { keys, sign } = await setup();
    await expect(verifyFirebaseIdToken(await sign({}), '', keys)).rejects.toThrow('not configured');
  });
});
