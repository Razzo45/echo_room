'use client';

import { useEffect, useState } from 'react';

type Props = {
  value: number | null;
  rolling: boolean;
  band?: string | null;
};

const TICK_MS = 80;

function bandLabel(band: string | null | undefined): string {
  if (!band) return '';
  if (band === 'critical_success') return 'Critical success';
  if (band === 'success') return 'Success';
  if (band === 'mixed') return 'Mixed result';
  if (band === 'fail') return 'Fail';
  if (band === 'critical_fail') return 'Critical fail';
  return band.replace(/_/g, ' ');
}

function bandColor(band: string | null | undefined): string {
  if (!band) return 'text-white/70';
  if (band === 'critical_success') return 'text-emerald-300';
  if (band === 'success') return 'text-green-300';
  if (band === 'mixed') return 'text-amber-200';
  if (band === 'fail') return 'text-orange-300';
  if (band === 'critical_fail') return 'text-red-400';
  return 'text-white/70';
}

export function D20Die({ value, rolling, band }: Props) {
  const [tick, setTick] = useState<number | null>(null);

  useEffect(() => {
    if (!rolling) {
      setTick(null);
      return;
    }
    const id = window.setInterval(() => {
      setTick(Math.floor(Math.random() * 20) + 1);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [rolling]);

  const display = rolling ? (tick ?? '—') : (value ?? '—');
  const settled = !rolling && value != null;

  return (
    <div className="d20-card">
      <div className="relative flex flex-col items-center py-6">
        {/* Glow under die */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-32 h-16 rounded-full blur-2xl transition-opacity duration-500 ${
            settled ? 'opacity-50' : 'opacity-30'
          }`}
          style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.6), transparent 70%)' }}
        />

        {/* Icosahedron shape */}
        <div
          className={`relative w-32 h-32 ${rolling ? 'animate-d20-tumble' : settled ? 'animate-d20-settle' : ''}`}
          style={{ perspective: '600px', transformStyle: 'preserve-3d' }}
        >
          {/* Top facets */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 40%, #92400e 100%)',
              boxShadow: '0 8px 32px rgba(180,83,9,0.4)',
            }}
          />
          {/* Highlight facet overlay */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              background: 'linear-gradient(170deg, rgba(255,255,255,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.2) 100%)',
            }}
          />
          {/* Edge lines for depth */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="64,0 128,49 105,128 23,128 0,49" fill="none" stroke="rgba(120,53,15,0.3)" strokeWidth="1" />
            <line x1="64" y1="0" x2="64" y2="76" stroke="rgba(120,53,15,0.2)" strokeWidth="0.75" />
            <line x1="0" y1="49" x2="105" y2="128" stroke="rgba(120,53,15,0.15)" strokeWidth="0.75" />
            <line x1="128" y1="49" x2="23" y2="128" stroke="rgba(120,53,15,0.15)" strokeWidth="0.75" />
          </svg>
          {/* Number */}
          <span
            className="absolute inset-0 flex items-center justify-center text-4xl font-black tabular-nums text-white z-10"
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(251,191,36,0.4)',
              paddingBottom: '0.15em',
            }}
          >
            {display}
          </span>
        </div>

        {/* Result readout */}
        {settled && (
          <div className="mt-4 text-center animate-d20-fade-in">
            <p className="text-3xl font-black text-white tabular-nums" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              {value}
            </p>
            {band && (
              <p className={`text-sm font-semibold mt-0.5 ${bandColor(band)}`}>
                {bandLabel(band)}
              </p>
            )}
          </div>
        )}

        {rolling && (
          <p className="mt-4 text-sm text-white/50 animate-pulse">Rolling...</p>
        )}
      </div>
    </div>
  );
}
