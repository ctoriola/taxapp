import React, { useState } from 'react';
import { Sparkles, Send, RefreshCw } from 'lucide-react';
import type { AiFacts } from '../lib/aiFacts';
import { askAi, getAiSummary, AiSummary } from '../services/aiService';

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
    <div className="mt-6 pt-6 border-t border-stone-200" aria-label="AI assistant">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Sparkles className="w-4 h-4 text-violet-600" />
          AI assistant
        </h4>
        <button
          type="button"
          onClick={explain}
          disabled={isSummarising}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-60"
        >
          {summary ? <RefreshCw className={`w-3.5 h-3.5 ${isSummarising ? 'animate-spin' : ''}`} /> : <Sparkles className="w-3.5 h-3.5" />}
          {isSummarising ? 'Thinking…' : summary ? 'Refresh explanation' : 'Explain my tax position'}
        </button>
      </div>

      {summary && (
        <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100 mb-4" aria-live="polite">
          <p className="text-sm font-semibold text-violet-950">{summary.headline}</p>
          <p className="text-xs text-violet-900 mt-2 leading-relaxed whitespace-pre-line">{summary.summary}</p>
          {summary.priorities.length > 0 && (
            <ol className="mt-3 space-y-2 list-decimal list-inside">
              {summary.priorities.map((p, i) => (
                <li key={i} className="text-xs text-violet-900">
                  <span className="font-semibold">{p.title}</span>: {p.detail}
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
          className="input-field py-2 text-sm flex-1"
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          aria-label="Ask"
          className="px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
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
              className="px-3 py-1.5 rounded-full bg-stone-100 text-xs text-slate-700 hover:bg-stone-200"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {isAsking && <p className="mt-3 text-xs text-slate-500">Thinking…</p>}

      {answer && !isAsking && (
        <div className="mt-3 p-4 rounded-2xl bg-stone-50 border border-stone-200" aria-live="polite">
          <p className="text-xs font-semibold text-slate-500">{answer.question}</p>
          <p className="text-sm text-slate-800 mt-1 leading-relaxed whitespace-pre-line">{answer.text}</p>
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}

      <p className="mt-4 text-xs text-slate-500">
        AI-generated by Groq from the figures above. Your summarised figures and customer names are sent to Groq to produce this.
        It can make mistakes and isn't tax advice; check with a tax professional before acting.
      </p>
    </div>
  );
}
