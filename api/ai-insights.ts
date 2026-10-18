import { handleAiInsights } from '../server/aiInsights.js';
import { verifyFirebaseIdToken } from '../server/firebaseAuth.js';

declare const process: { env: Record<string, string | undefined> };

// Vercel serverless function: POST /api/ai-insights
// Env (Vercel project settings): GROQ_API_KEY (required), GROQ_MODEL (optional),
// FIREBASE_PROJECT_ID (optional; falls back to VITE_FIREBASE_PROJECT_ID)
export async function POST(request: Request): Promise<Response> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
  const result = await handleAiInsights(request.headers.get('authorization'), await request.text(), {
    verifyToken: (token) => verifyFirebaseIdToken(token, projectId),
    fetch,
    env: { GROQ_API_KEY: process.env.GROQ_API_KEY, GROQ_MODEL: process.env.GROQ_MODEL },
  });
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
