import React, { useEffect, useRef, useState } from 'react';
import { FileImage, Upload, Trash2, Check } from 'lucide-react';
import { PanelTitle } from './dashboard/ui';
import LetterheadBanner from './LetterheadBanner';
import { useAuth } from '../context/AuthContext';
import { useLetterhead } from '../hooks/useLetterhead';
import {
  DEFAULT_LETTERHEAD,
  Letterhead,
  LetterheadAlign,
  LETTERHEAD_LIMITS,
  prepareLetterheadImage,
  removeLetterhead,
  saveLetterhead,
} from '../services/brandingService';

// Compares what the user can change (ignores the server's updated_at)
function sameLetterhead(a: Letterhead | null, b: Letterhead | null): boolean {
  if (!a || !b) return a === b;
  return a.image === b.image && a.height === b.height && a.margin === b.margin && a.align === b.align && a.showDetails === b.showDetails;
}

// Settings panel: upload a PNG/JPG letterhead, adjust height, margins and alignment, and preview
// it on a sample invoice before saving
export default function LetterheadSettings() {
  const { profile } = useAuth();
  const { letterhead: saved, isLoading } = useLetterhead();
  const [draft, setDraft] = useState<Letterhead | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  // Follow the saved letterhead as it loads or changes elsewhere, but never throw away unsaved
  // edits (e.g. an image picked before the saved one finished loading)
  const lastSaved = useRef<Letterhead | null>(null);
  useEffect(() => {
    if (isLoading) return;
    setDraft((current) => {
      const hasUnsavedEdits = current !== null && !sameLetterhead(current, lastSaved.current) && !sameLetterhead(current, saved);
      return hasUnsavedEdits ? current : saved;
    });
    lastSaved.current = saved;
  }, [saved, isLoading]);

  const dirty = !sameLetterhead(draft, saved);

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    setIsBusy(true);
    try {
      const image = await prepareLetterheadImage(file);
      setDraft({ ...DEFAULT_LETTERHEAD, ...(draft || {}), image });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That image couldn't be used.");
    } finally {
      setIsBusy(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setIsBusy(true);
    setError('');
    try {
      await saveLetterhead({ image: draft.image, height: draft.height, margin: draft.margin, align: draft.align, showDetails: draft.showDetails });
      setNotice('Letterhead saved. It now appears on your invoices and PDFs.');
    } catch {
      setError("Couldn't save the letterhead. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const remove = async () => {
    if (!saved) {
      setDraft(null);
      return;
    }
    if (!window.confirm('Remove your letterhead from invoices?')) return;
    setIsBusy(true);
    try {
      await removeLetterhead();
      setNotice('Letterhead removed.');
    } catch {
      setError("Couldn't remove the letterhead. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const set = <K extends keyof Letterhead>(key: K, value: Letterhead[K]) => draft && setDraft({ ...draft, [key]: value });

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="letterhead-title">
      <PanelTitle icon={<FileImage className="w-[18px] h-[18px]" />} title="Invoice letterhead" />
      <p id="letterhead-title" className="sr-only">Invoice letterhead</p>
      <p className="text-sm text-brand-muted -mt-2 mb-5">
        Upload your letterhead as a PNG or JPG. It sits at the top of every invoice, print-out and PDF.
      </p>

      {error && <p role="alert" className="mb-4 rounded-2xl border border-brand-down/20 bg-brand-down/5 px-4 py-3 text-sm text-brand-down">{error}</p>}
      {notice && !dirty && <p role="status" className="mb-4 rounded-2xl bg-brand-lime/40 px-4 py-3 text-sm text-brand-forest">{notice}</p>}

      {!draft ? (
        <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-line bg-brand-canvas/50 px-4 py-10 text-center cursor-pointer hover:border-brand-forest/40 transition-colors">
          <Upload className="w-6 h-6 text-brand-ink" />
          <span className="text-sm font-medium text-brand-ink">{isBusy ? 'Preparing image…' : 'Upload a letterhead'}</span>
          <span className="text-xs text-brand-muted">PNG or JPG, up to 5 MB. A wide banner works best.</span>
          <input type="file" accept="image/png,image/jpeg" onChange={choose} disabled={isBusy} className="sr-only" aria-label="Upload letterhead image" />
        </label>
      ) : (
        <div className="space-y-5">
          {/* Live preview on a sample invoice */}
          <div className="rounded-2xl bg-brand-canvas p-3 sm:p-4" aria-label="Letterhead preview">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <LetterheadBanner letterhead={draft} />
              <div className="px-5 pb-5 pt-3 border-t border-brand-line">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {!draft.showDetails && profile?.tax_id && <p className="text-xs text-brand-muted">TIN: {profile.tax_id}</p>}
                    {draft.showDetails && (
                      <>
                        <p className="font-bold text-brand-ink truncate">{profile?.business_name || 'Your business'}</p>
                        <p className="text-xs text-brand-muted">{[profile?.email, profile?.phone, profile?.tax_id && `TIN: ${profile.tax_id}`].filter(Boolean).join(' · ')}</p>
                      </>
                    )}
                  </div>
                  <p className="font-bold text-brand-ink whitespace-nowrap">INV-0001</p>
                </div>
                <div className="mt-4 space-y-1.5" aria-hidden="true">
                  <div className="h-2 rounded-full bg-brand-canvas w-full"></div>
                  <div className="h-2 rounded-full bg-brand-canvas w-4/5"></div>
                  <div className="h-2 rounded-full bg-brand-canvas w-3/5"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="lh-height" className="field-label">Header height <span className="text-brand-muted font-normal">({draft.height}px)</span></label>
              <input id="lh-height" type="range" min={LETTERHEAD_LIMITS.minHeight} max={LETTERHEAD_LIMITS.maxHeight} step={4} value={draft.height} onChange={(e) => set('height', Number(e.target.value))} className="w-full accent-brand-forest" />
            </div>
            <div>
              <label htmlFor="lh-margin" className="field-label">Side margins <span className="text-brand-muted font-normal">({draft.margin}px)</span></label>
              <input id="lh-margin" type="range" min={0} max={LETTERHEAD_LIMITS.maxMargin} step={4} value={draft.margin} onChange={(e) => set('margin', Number(e.target.value))} className="w-full accent-brand-forest" />
            </div>
            <div>
              <p className="field-label">Alignment</p>
              <div role="radiogroup" aria-label="Alignment" className="inline-flex p-1 rounded-full bg-brand-canvas">
                {(['left', 'center', 'right'] as LetterheadAlign[]).map((align) => (
                  <button
                    key={align}
                    type="button"
                    role="radio"
                    aria-checked={draft.align === align}
                    onClick={() => set('align', align)}
                    className={`px-4 py-1.5 rounded-full text-sm capitalize transition-colors ${draft.align === align ? 'bg-white text-brand-ink font-semibold shadow-sm' : 'text-brand-muted hover:text-brand-ink'}`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-start gap-3 text-sm text-brand-ink sm:pt-7 cursor-pointer">
              <input type="checkbox" checked={draft.showDetails} onChange={(e) => set('showDetails', e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-forest" />
              <span>
                Show business details under the letterhead
                <span className="block text-xs text-brand-muted">Turn off if your letterhead already has your name and address. Your TIN always stays on the invoice.</span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={save} disabled={isBusy || !dirty} className="btn-primary">
              <Check className="w-4 h-4" />
              {isBusy ? 'Saving…' : dirty ? 'Save letterhead' : 'Saved'}
            </button>
            <label className="btn-secondary cursor-pointer">
              <Upload className="w-4 h-4" />
              Replace image
              <input type="file" accept="image/png,image/jpeg" onChange={choose} disabled={isBusy} className="sr-only" aria-label="Replace letterhead image" />
            </label>
            <button type="button" onClick={remove} disabled={isBusy} className="btn-danger">
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
            {dirty && saved && (
              <button type="button" onClick={() => setDraft(saved)} className="text-sm font-medium text-brand-forest hover:underline px-2">
                Undo changes
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
