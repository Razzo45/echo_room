'use client';

import type { StoryState } from '@/lib/story-runtime';
import type { Player } from './types';

type Props = {
  storyState: StoryState;
  players: Player[];
  myUserId: string;
  finalSynthesisReady: boolean;
  completeSubmitting: boolean;
  onComplete: () => void;
};

export function FinalPanel({
  storyState,
  players,
  myUserId,
  finalSynthesisReady,
  completeSubmitting,
  onComplete,
}: Props) {
  const myFinalTapped = Boolean(players.find((p) => p.id === myUserId)?.completedAt);
  const allFinalTapped = players.length > 0 && players.every((p) => p.completedAt);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
      <h1 className="text-lg font-bold text-gray-900 mb-3">Story complete</h1>
      {finalSynthesisReady && (
        <div className="p-4 rounded-xl bg-primary-50 border border-primary-100 mb-4">
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {storyState.finalSynthesis?.text}
          </p>
        </div>
      )}
      {!finalSynthesisReady && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Drafting final synthesis...</p>
          <p className="text-xs text-amber-800 mt-1">
            Hold tight. We are compiling the collaborative story outcome before finish is enabled.
          </p>
        </div>
      )}
      {myFinalTapped ? (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
          {allFinalTapped ? (
            <p>Everyone has finished. Handing off to the artifact…</p>
          ) : (
            <p>
              You have finished. Waiting for other players to tap <span className="font-semibold">Finish story</span>…
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onComplete}
          disabled={completeSubmitting || !finalSynthesisReady}
          className="btn btn-primary w-full mt-4"
        >
          {completeSubmitting
            ? 'Finalizing...'
            : finalSynthesisReady
              ? 'Finish story'
              : 'Waiting for final synthesis...'}
        </button>
      )}
    </div>
  );
}
