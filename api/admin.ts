import { handleAdmin } from '../server/admin.js';
import { getAdminServices } from '../server/firebaseAdmin.js';

declare const process: { env: Record<string, string | undefined> };

// Vercel serverless function: POST /api/admin (the admin console API)
// Env: ADMIN_EMAIL, ADMIN_PASSWORD, FIREBASE_SERVICE_ACCOUNT (required);
//      ADMIN_SESSION_SECRET (optional), VITE_FIREBASE_API_KEY (for password-reset emails)
export async function POST(request: Request): Promise<Response> {
  const services = getAdminServices();
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const config = email && password
    ? { email, password, secretMaterial: process.env.ADMIN_SESSION_SECRET || services?.privateKey || '' }
    : null;

  const result = await handleAdmin(
    {
      cookie: request.headers.get('cookie'),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      body: await request.text(),
    },
    {
      config,
      services,
      apiKey: process.env.VITE_FIREBASE_API_KEY || '',
      authEmulatorHost: process.env.FIREBASE_AUTH_EMULATOR_HOST,
      fetch,
    }
  );

  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  if (result.setCookie) headers.append('Set-Cookie', result.setCookie);
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}
