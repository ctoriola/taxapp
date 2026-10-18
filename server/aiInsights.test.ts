import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGroqRequest, DEFAULT_MODEL, handleAiInsights, resetRateLimits, SYSTEM_PROMPT, AiDeps } from './aiInsights';

const FACTS = { totals: { netVat: 43500 } };

function groqReply(content: unknown, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status });
}

function deps(overrides: Partial<AiDeps> = {}): AiDeps & { fetch: ReturnType<typeof vi.fn> } {
  return {
    verifyToken: vi.fn(async (token: string) => {
      if (token !== 'good-token') throw new Error('bad');
      return 'user-1';
    }),
    fetch: vi.fn(async () => groqReply({ headline: 'You owe ₦43,500', summary: 'Details.', priorities: [{ title: 'File', detail: 'By the 21st' }] })),
    env: { GROQ_API_KEY: 'gsk_test' },
    ...overrides,
  } as AiDeps & { fetch: ReturnType<typeof vi.fn> };
}

const summaryBody = JSON.stringify({ mode: 'summary', facts: FACTS });

describe('handleAiInsights', () => {
  beforeEach(() => resetRateLimits());

  it('returns a summary and sends the facts, schema and key to Groq', async () => {
    const d = deps();
    const result = await handleAiInsights('Bearer good-token', summaryBody, d);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ headline: 'You owe ₦43,500' });

    const [url, init] = d.fetch.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer gsk_test');
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe(DEFAULT_MODEL);
    expect(sent.response_format.json_schema.strict).toBe(true);
    expect(sent.messages[0].content).toBe(SYSTEM_PROMPT);
    expect(sent.messages[1].content).toContain('"netVat":43500');
  });

  it('answers questions and includes the question in the prompt', async () => {
    const d = deps({ fetch: vi.fn(async () => groqReply({ answer: 'You owe ₦43,500 for September.' })) });
    const result = await handleAiInsights('Bearer good-token', JSON.stringify({ mode: 'question', facts: FACTS, question: 'How much VAT do I owe?' }), d);
    expect(result).toEqual({ status: 200, body: { answer: 'You owe ₦43,500 for September.' } });
    expect(JSON.parse(d.fetch.mock.calls[0][1].body).messages[1].content).toContain('How much VAT do I owe?');
  });

  it('uses GROQ_MODEL when set, and only sends reasoning options to gpt-oss models', () => {
    expect(buildGroqRequest('summary', FACTS, 'openai/gpt-oss-120b')).toMatchObject({ reasoning_effort: 'low', include_reasoning: false });
    const other = buildGroqRequest('summary', FACTS, 'qwen/qwen3-32b');
    expect(other).not.toHaveProperty('reasoning_effort');
    expect(other).not.toHaveProperty('include_reasoning');
  });

  it('refuses when the key is missing, without calling Groq', async () => {
    const d = deps({ env: {} });
    expect((await handleAiInsights('Bearer good-token', summaryBody, d)).status).toBe(503);
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it('requires a valid Firebase token', async () => {
    const d = deps();
    expect((await handleAiInsights(null, summaryBody, d)).status).toBe(401);
    expect((await handleAiInsights('Bearer forged', summaryBody, d)).status).toBe(401);
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it('validates the request', async () => {
    const d = deps();
    const call = (body: string) => handleAiInsights('Bearer good-token', body, d).then((r) => r.status);
    expect(await call('not json')).toBe(400);
    expect(await call(JSON.stringify({ mode: 'poem', facts: FACTS }))).toBe(400);
    expect(await call(JSON.stringify({ mode: 'summary' }))).toBe(400);
    expect(await call(JSON.stringify({ mode: 'question', facts: FACTS, question: '  ' }))).toBe(400);
    expect(await call(JSON.stringify({ mode: 'question', facts: FACTS, question: 'x'.repeat(501) }))).toBe(400);
    expect(await call(JSON.stringify({ mode: 'summary', facts: { big: 'x'.repeat(50_000) } }))).toBe(413);
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it('rate limits each user', async () => {
    const d = deps();
    const statuses = [];
    for (let i = 0; i < 21; i++) statuses.push((await handleAiInsights('Bearer good-token', summaryBody, d)).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
  });

  it('maps Groq failures to friendly errors', async () => {
    const withStatus = (status: number) => deps({ fetch: vi.fn(async () => new Response('{}', { status })) });
    expect((await handleAiInsights('Bearer good-token', summaryBody, withStatus(429))).status).toBe(429);
    expect((await handleAiInsights('Bearer good-token', summaryBody, withStatus(401))).status).toBe(503);
    expect((await handleAiInsights('Bearer good-token', summaryBody, withStatus(500))).status).toBe(502);
    const network = deps({ fetch: vi.fn(async () => { throw new Error('down'); }) });
    expect((await handleAiInsights('Bearer good-token', summaryBody, network)).status).toBe(504);
  });

  it('rejects replies that do not match the expected shape', async () => {
    const bad = deps({ fetch: vi.fn(async () => groqReply({ headline: 'Only a headline' })) });
    expect((await handleAiInsights('Bearer good-token', summaryBody, bad)).status).toBe(502);
  });

  it('caps priorities at three', async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ title: `P${i}`, detail: 'd' }));
    const d = deps({ fetch: vi.fn(async () => groqReply({ headline: 'h', summary: 's', priorities: many })) });
    const result = await handleAiInsights('Bearer good-token', summaryBody, d);
    expect((result.body as { priorities: unknown[] }).priorities).toHaveLength(3);
  });
});
