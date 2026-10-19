import React, { useState } from 'react';
import { Sparkles, Send, RefreshCw } from 'lucide-react';
import type { AiFacts } from '../lib/aiFacts';
import { askAi, getAiSummary, AiSummary } from '../services/aiService';
import { withNaira } from './dashboard/ui';

const SUGGESTED_QUESTIONS = [
  'How much VAT do I owe, and by when?',
  'Which customers should I chase for payment?',
  'What should I do before my next VAT return?',
];

// Groq-powered explanations, generated on request from figures the app has already computed
export default function AiAssistant({ facts }: { facts: AiFacts }) {
  const [summary, setSummary] = useState<AiSummary | null>(null);
  const [isSummarising, setIsSummarising] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ question: string; text: string } | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState('');

  const explain = async () => {
    setError('');
    setIsSummarising(true);
    try {
      setSummary(await getAiSummary(facts));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSummarising(false);
    }
  };

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setError('');
    setIsAsking(true);
    try {
      setAnswer({ question: q, text: await askAi(facts, q) });
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="rounded-3xl bg-brand-lime/25 p-5" aria-label="AI assistant">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <Sparkles className="w-4 h-4 text-brand-forest" />
          AI assistant
        </h3>
        <button
          type="button"
          onClick={explain}
          disabled={isSummarising}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-brand-forest text-brand-lime text-xs font-semibold hover:bg-brand-forest-hover disabled:opacity-60"
        >
          {summary ? <RefreshCw className={`w-3.5 h-3.5 ${isSummarising ? 'animate-spin' : ''}`} /> : <Sparkles className="w-3.5 h-3.5" />}
          {isSummarising ? 'Thinking…' : summary ? 'Refresh explanation' : 'Explain my tax position'}
        </button>
      </div>

      {summary && (
        <div className="p-4 rounded-2xl bg-white mb-4" aria-live="polite">
          <p className="text-sm font-semibold text-brand-ink">{withNaira(summary.headline)}</p>
          <p className="text-xs text-brand-ink/80 mt-2 leading-relaxed whitespace-pre-line">{withNaira(summary.summary)}</p>
          {summary.priorities.length > 0 && (
            <ol className="mt-3 space-y-2 list-decimal list-inside">
              {summary.priorities.map((p, i) => (
                <li key={i} className="text-xs text-brand-ink/80">
                  <span className="font-semibold">{withNaira(p.title)}</span>: {withNaira(p.detail)}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="Ask about your VAT, invoices or expenses…"
          aria-label="Ask the AI assistant a question"
          className="flex-1 min-w-0 h-11 px-4 rounded-full bg-white border border-transparent text-sm focus:outline-none focus:ring-2 focus:ring-brand-forest"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          aria-label="Ask"
          className="w-11 h-11 flex-shrink-0 rounded-full bg-brand-forest text-brand-lime flex items-center justify-center hover:bg-brand-forest-hover disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {!answer && !isAsking && (
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="px-3 py-1.5 rounded-full bg-white text-xs text-brand-ink hover:bg-brand-canvas text-left"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {isAsking && <p className="mt-3 text-xs text-brand-ink/60">Thinking…</p>}

      {answer && !isAsking && (
        <div className="mt-3 p-4 rounded-2xl bg-white" aria-live="polite">
          <p className="text-xs font-semibold text-brand-muted">{answer.question}</p>
          <p className="text-sm text-brand-ink mt-1 leading-relaxed whitespace-pre-line">{withNaira(answer.text)}</p>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-xs text-brand-down">{error}</p>}

      <p className="mt-4 text-xs text-brand-ink/60">
        AI-generated by Groq from your figures. Your summarised figures and customer names are sent to Groq to produce this.
        It can make mistakes and isn't tax advice; check with a tax professional before acting.
      </p>
    </div>
  );
}
