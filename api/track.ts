// Vercel serverless function: POST /api/track (anonymous visit and online-now counting)
// Server code is loaded lazily so a setup problem can never break visitors' requests.
export async function POST(request: Request): Promise<Response> {
  let status = 204;
  try {
    const [{ handleTrack }, { getAdminServices }] = await Promise.all([
      import('../server/track.js'),
      import('../server/firebaseAdmin.js'),
    ]);
    status = await handleTrack(await request.text(), getAdminServices());
  } catch (err) {
    console.error('Tracking failed', err);
  }
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}
