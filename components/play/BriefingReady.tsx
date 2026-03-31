'use client';

type Props = {
  questName: string;
  questDescription?: string;
  readyCount: number;
  playerCount: number;
  myReady: boolean;
  readySubmitting: boolean;
  onReady: () => void;
};

export function BriefingReady({
  questName,
  questDescription,
  readyCount,
  playerCount,
  myReady,
  readySubmitting,
  onReady,
}: Props) {
  return (
    <div className="space-y-4">
      {(questDescription || questName) && (
        <div className="bg-white rounded-3xl border border-amber-100 shadow p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
            Beat 0 &middot; Briefing
          </p>
          <p className="text-base font-bold text-gray-900">{questName}</p>
          {questDescription ? (
            <p className="text-sm text-stone-600 mt-3 whitespace-pre-wrap leading-relaxed">
              {questDescription}
            </p>
          ) : (
            <p className="text-sm text-stone-500 mt-3 italic">No scenario briefing was set for this quest.</p>
          )}
        </div>
      )}
      <div className="bg-white rounded-3xl border border-amber-100 shadow p-5">
        <h1 className="text-lg font-bold text-gray-900 mb-2">Ready to begin</h1>
        <p className="text-sm text-stone-600 mb-4">
          When everyone has read the briefing above, confirm you are ready. The story starts once all players
          tap the button.
        </p>
        <p className="text-sm font-medium text-amber-700 mb-4">
          {readyCount} of {playerCount} ready
        </p>
        <button
          type="button"
          onClick={onReady}
          disabled={myReady || readySubmitting}
          className="btn btn-primary w-full"
        >
          {myReady ? 'You are ready' : readySubmitting ? 'Saving...' : "I'm ready"}
        </button>
      </div>
    </div>
  );
}
