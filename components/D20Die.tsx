'use client';

type Props = {
  value: number | null;
  rolling: boolean;
};

/**
 * Stylised icosahedron-style d20 with tumble animation while rolling.
 */
export function D20Die({ value, rolling }: Props) {
  const display = value != null ? value : '—';

  return (
    <div className="relative w-36 h-36 mx-auto perspective-[520px]" style={{ perspective: '520px' }}>
      <div
        className={`absolute inset-0 flex items-center justify-center ${rolling ? 'animate-d20-tumble' : ''}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="relative w-28 h-28 flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-br from-amber-400 via-primary-600 to-indigo-900 shadow-[0_12px_40px_rgba(49,46,129,0.35)] border border-indigo-950/30"
            style={{
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              transform: 'translateZ(4px)',
            }}
          />
          <div
            className="absolute inset-[12%] bg-gradient-to-t from-primary-900/50 to-transparent opacity-60"
            style={{
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
            }}
          />
          <span
            className="relative z-10 text-4xl font-black tabular-nums text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
            style={{ textShadow: '0 1px 0 rgba(255,255,255,0.25)' }}
          >
            {display}
          </span>
          <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            d20
          </span>
        </div>
      </div>
    </div>
  );
}
