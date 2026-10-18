import { auth } from '../lib/firebase';
import type { AiFacts } from '../lib/aiFacts';

export interface AiSummary {
  headline: string;
  summary: string;
  priorities: { title: string; detail: string }[];
}

async function callAi<T>(body: Record<string, unknown>): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Please sign in again.');

  let response: Response;
  try {
    response = await fetch('/api/ai-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Connection error. Please check your internet and try again.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'AI insights are unavailable right now. Please try again.');
  }
  return data as T;
}

export function getAiSummary(facts: AiFacts): Promise<AiSummary> {
  return callAi<AiSummary>({ mode: 'summary', facts });
}

export async function askAi(facts: AiFacts, question: string): Promise<string> {
  const { answer } = await callAi<{ answer: string }>({ mode: 'question', facts, question });
  return answer;
}
