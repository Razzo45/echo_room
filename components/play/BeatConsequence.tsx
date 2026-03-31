'use client';

import type { BeatState } from './types';

type Props = {
  beat: BeatState;
  continueReady: number;
  continueTotal: number;
  myContinueAck: boolean;
  advanceSubmitting: boolean;
  aiGracePeriodDone: boolean;
  onAdvance: () => void;
};

export function BeatConsequence({
  beat,
  continueReady,
  continueTotal,
  myContinueAck,
  advanceSubmitting,
  aiGracePeriodDone,
  onAdvance,
}: Props) {
  const hasConsequence = Boolean(beat.consequence);
  const isAi = beat.consequence?.mode === 'ai';
  const showWaiting = hasConsequence && !isAi && !aiGracePeriodDone;

  if (!hasConsequence) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3">
        <h1 className="text-lg font-bold text-gray-900">What happened</h1>
        <p className="text-sm text-gray-600">The story is resolving this beat now.</p>
      </div>
    );
  }

  if (showWaiting) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600 mx-auto" />
        <p className="text-sm font-semibold text-gray-900">Waiting for effects...</p>
        <p className="text-xs text-gray-500">The narrator is weaving the consequences of your actions.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3">
      <h1 className="text-lg font-bold text-gray-900">What happened</h1>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{beat.consequence!.text}</p>
      <p className="text-sm font-medium text-primary-800">
        Ready to continue: {continueReady} / {continueTotal}
      </p>
      <p className="text-xs text-gray-500">
        Everyone taps Continue when ready. The story moves on only after all players have continued.
      </p>
      <button
        type="button"
        onClick={onAdvance}
        disabled={myContinueAck || advanceSubmitting}
        className="btn btn-primary w-full"
      >
        {myContinueAck
          ? 'You are ready — waiting for others'
          : advanceSubmitting
            ? 'Saving...'
            : 'Continue'}
      </button>
    </div>
  );
}
