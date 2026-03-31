'use client';

import { D20Die } from '@/components/D20Die';
import type { Player, BeatState } from './types';

type Props = {
  beat: BeatState;
  players: Player[];
  myRoll: { value: number; band: string } | undefined;
  rolling: boolean;
  rollSubmitting: boolean;
  rollDisplayValue: number | null;
  allRolled: boolean;
  myRollContinueAck: boolean;
  rollContinueReady: number;
  advanceSubmitting: boolean;
  onRoll: () => void;
  onAdvance: () => void;
};

export function RollReveal({
  beat,
  players,
  myRoll,
  rolling,
  rollSubmitting,
  rollDisplayValue,
  allRolled,
  myRollContinueAck,
  rollContinueReady,
  advanceSubmitting,
  onRoll,
  onAdvance,
}: Props) {
  const rollCount = Object.keys(beat.rolls).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Revealed actions</h2>
        <div className="space-y-1.5">
          {players.map((player) => (
            <p key={player.id} className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">{player.name}:</span>{' '}
              {beat.submissions[player.id] ?? '...'}
            </p>
          ))}
        </div>
      </div>

      {!allRolled && (
        <>
          <D20Die
            value={rollDisplayValue}
            rolling={rolling && !myRoll}
            band={myRoll && !rolling ? myRoll.band : null}
          />
          <button
            type="button"
            onClick={onRoll}
            disabled={Boolean(myRoll) || rollSubmitting}
            className="btn btn-primary w-full"
          >
            {myRoll ? 'Roll saved' : rollSubmitting ? 'Rolling...' : 'Roll d20'}
          </button>
          <p className="text-xs text-gray-500 text-center">Rolls submitted: {rollCount}/{players.length}</p>
        </>
      )}

      {allRolled && (
        <>
          <D20Die value={rollDisplayValue} rolling={false} band={myRoll ? myRoll.band : null} />
          <div className="bg-white rounded-3xl border border-gray-100 shadow p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">All rolls are in</h2>
            <div className="space-y-2">
              {players.map((player) => {
                const r = beat.rolls[player.id];
                if (!r) return null;
                const bandLabel =
                  r.band === 'critical_success' ? 'Crit!' : r.band === 'critical_fail' ? 'Fumble' :
                  r.band === 'success' ? 'Success' : r.band === 'fail' ? 'Fail' : 'Mixed';
                const bandColor =
                  r.band === 'critical_success' || r.band === 'success' ? 'text-emerald-600' :
                  r.band === 'critical_fail' || r.band === 'fail' ? 'text-red-600' : 'text-amber-600';
                return (
                  <div key={player.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{player.name}</span>
                    <span className={`font-bold ${bandColor}`}>
                      d20 &rarr; {r.value} <span className="font-normal text-xs">({bandLabel})</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-sm font-medium text-primary-800">
              Ready to continue: {rollContinueReady} / {players.length}
            </p>
            <p className="text-xs text-gray-500">
              Tap Continue once you have reviewed the rolls. The story advances when everyone is ready.
            </p>
            <button
              type="button"
              onClick={onAdvance}
              disabled={myRollContinueAck || advanceSubmitting}
              className="btn btn-primary w-full"
            >
              {myRollContinueAck
                ? 'You are ready — waiting for others'
                : advanceSubmitting
                  ? 'Saving...'
                  : 'Continue'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
