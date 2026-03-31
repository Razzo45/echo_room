'use client';

import type { QuestDecisionData, DecisionOption } from './types';
import type { BeatNumber } from '@/lib/story-runtime';

const ACTION_MAX_CHARS = 120;

function optionBlurb(opt: DecisionOption | undefined): string {
  if (!opt) return '';
  const sentencePool = [
    opt.tradeoffs,
    ...(opt.outcomes ?? []),
    ...(opt.risks ?? []),
  ]
    .filter((v): v is string => Boolean(v && v.trim()))
    .flatMap((text) =>
      text.split(/[.!?]+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const sentence of sentencePool) {
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(sentence);
    if (unique.length >= 2) break;
  }
  const concise = unique.join('. ');
  if (!concise) return 'Use this as a directional nudge, not a strict script.';
  const clipped = concise.length > 160 ? `${concise.slice(0, 157).trimEnd()}...` : concise;
  return clipped.endsWith('.') ? clipped : `${clipped}.`;
}

type Props = {
  currentBeat: BeatNumber;
  totalBeats: BeatNumber;
  currentMeta: QuestDecisionData | null;
  mySubmittedAction?: string;
  actionText: string;
  actionSubmitting: boolean;
  submissionCount: number;
  playerCount: number;
  onActionTextChange: (text: string) => void;
  onSubmitAction: () => void;
};

export function BeatInput({
  currentBeat,
  totalBeats,
  currentMeta,
  mySubmittedAction,
  actionText,
  actionSubmitting,
  submissionCount,
  playerCount,
  onActionTextChange,
  onSubmitAction,
}: Props) {
  const pathKeys = currentMeta?.options ? ['A', 'B', 'C'].filter((k) => currentMeta.options[k]) : [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3">
        {currentMeta ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Beat {currentBeat} of {totalBeats}
            </p>
            <h1 className="text-lg font-bold text-gray-900 leading-snug">{currentMeta.title}</h1>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{currentMeta.description}</p>
          </>
        ) : (
          <p className="text-sm text-gray-600">Write one short sentence describing your move.</p>
        )}
      </div>

      {pathKeys.length > 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Paths (reference only)
          </p>
          <p className="text-xs text-gray-500 mb-3">
            These are not votes — use them as inspiration, then write your own line.
          </p>
          <div className="grid gap-2">
            {pathKeys.map((key) => (
              <div key={key} className="rounded-xl bg-white border border-gray-100 p-3 text-sm">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-800 text-xs font-bold mr-2">
                  {key}
                </span>
                <span className="font-semibold text-gray-900">{currentMeta?.options[key]?.label}</span>
                <p className="text-gray-600 mt-1 pl-9">{optionBlurb(currentMeta?.options[key])}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
        {mySubmittedAction ? (
          <>
            <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1">Locked in</p>
            <p className="text-sm text-gray-700 mb-4">{mySubmittedAction}</p>
            <p className="text-xs text-gray-500">Blind input is active: reveals after all submissions.</p>
          </>
        ) : (
          <>
            <label className="label">Your action (one sentence)</label>
            <textarea
              rows={3}
              maxLength={ACTION_MAX_CHARS}
              className="input min-h-[100px]"
              value={actionText}
              onChange={(e) => onActionTextChange(e.target.value.slice(0, ACTION_MAX_CHARS))}
              placeholder="I redirect power to shields while we cross."
            />
            <p className="mt-1 text-xs text-gray-500">{actionText.length}/{ACTION_MAX_CHARS}</p>
            <button
              type="button"
              onClick={onSubmitAction}
              disabled={actionSubmitting || !actionText.trim()}
              className="btn btn-primary w-full mt-4"
            >
              {actionSubmitting ? 'Sending...' : 'Lock action'}
            </button>
          </>
        )}
      </div>

      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4">
        <p className="text-sm text-primary-800">Submissions received: {submissionCount}/{playerCount}</p>
      </div>
    </div>
  );
}
