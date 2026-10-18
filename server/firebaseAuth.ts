import { createRemoteJWKSet, jwtVerify, JWTVerifyGetKey } from 'jose';

// Firebase ID tokens are RS256 JWTs signed with Google's securetoken keys. Verifying them here
// avoids pulling in the full firebase-admin SDK just to check who is calling.
const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let defaultKeys: JWTVerifyGetKey | null = null;

export async function verifyFirebaseIdToken(token: string, projectId: string, keys?: JWTVerifyGetKey): Promise<string> {
  if (!projectId) throw new Error('Firebase project ID is not configured');
  defaultKeys ??= createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  const { payload } = await jwtVerify(token, keys ?? defaultKeys, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    algorithms: ['RS256'],
  });
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('Token has no subject');
  return payload.sub;
}
