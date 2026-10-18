import { handleTrack } from '../server/track.js';
import { getAdminServices } from '../server/firebaseAdmin.js';

// Vercel serverless function: POST /api/track (anonymous visit and online-now counting)
export async function POST(request: Request): Promise<Response> {
  let status = 204;
  try {
    status = await handleTrack(await request.text(), getAdminServices());
  } catch (err) {
    console.error('Tracking failed', err);
  }
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}
