declare const process: { env: Record<string, string | undefined> };

// Vercel serverless function: POST /api/admin (the admin console API)
// Env: ADMIN_EMAIL, ADMIN_PASSWORD, FIREBASE_SERVICE_ACCOUNT (required);
//      ADMIN_SESSION_SECRET (optional), VITE_FIREBASE_API_KEY (for password-reset emails)
export async function POST(request: Request): Promise<Response> {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });

  // Loaded lazily so a setup problem (e.g. a malformed FIREBASE_SERVICE_ACCOUNT) is reported, not a crash
  let handleAdmin: typeof import('../server/admin.js').handleAdmin;
  let services: ReturnType<typeof import('../server/firebaseAdmin.js').getAdminServices>;
  try {
    const [adminModule, firebaseModule] = await Promise.all([import('../server/admin.js'), import('../server/firebaseAdmin.js')]);
    handleAdmin = adminModule.handleAdmin;
    services = firebaseModule.getAdminServices();
  } catch (err) {
    console.error('Admin API failed to start', err);
    const detail = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `The admin server couldn't start: ${detail}` }), { status: 500, headers });
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const config = email && password
    ? { email, password, secretMaterial: process.env.ADMIN_SESSION_SECRET || services?.privateKey || '' }
    : null;

  let result: Awaited<ReturnType<typeof handleAdmin>>;
  try {
    result = await handleAdmin(
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
  } catch (err) {
    console.error('Admin API request failed', err);
    const detail = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Firebase error: ${detail}` }), { status: 500, headers });
  }

  if (result.setCookie) headers.append('Set-Cookie', result.setCookie);
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}
