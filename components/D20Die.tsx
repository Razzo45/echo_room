'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type Props = {
  value: number | null;
  rolling: boolean;
  band?: string | null;
  onRollVisualComplete?: () => void;
};

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

export function D20Die({ value, rolling, band, onRollVisualComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<any>(null);
  const initRef = useRef(false);
  const [use3D, setUse3D] = useState(true);
  const [settled, setSettled] = useState(false);
  const [fallbackTick, setFallbackTick] = useState<number | null>(null);

  const initDiceBox = useCallback(async () => {
    if (initRef.current || !containerRef.current) return;
    initRef.current = true;

    try {
      const DiceBox = (await import('@3d-dice/dice-box-threejs')).default;
      const box = new DiceBox('#dice-scene', {
        theme_customColorset: {
          background: ['#d97706', '#b45309', '#92400e'],
          foreground: '#ffffff',
          outline: '#78350f',
          texture: 'marble',
          material: 'glass',
        },
        theme_surface: 'green-felt',
        gravity_multiplier: 600,
        light_intensity: 0.9,
        shadows: true,
        sounds: false,
        strength: 2,
        baseScale: 120,
        onRollComplete: () => {},
      });

      box.initialize();
      boxRef.current = box;
    } catch (err) {
      console.error('3D dice init failed, using fallback:', err);
      setUse3D(false);
    }
  }, []);

  useEffect(() => {
    initDiceBox();
    return () => {
      if (boxRef.current?.clear) {
        try { boxRef.current.clear(); } catch { /* noop */ }
      }
    };
  }, [initDiceBox]);

  useEffect(() => {
    if (!rolling) {
      if (value != null && !settled) {
        setSettled(true);
        onRollVisualComplete?.();
      }
      return;
    }

    setSettled(false);

    if (use3D && boxRef.current && value != null) {
      (async () => {
        try {
          if (boxRef.current.clear) boxRef.current.clear();
          await boxRef.current.roll(`1d20@${value}`);
          setSettled(true);
          onRollVisualComplete?.();
        } catch {
          setUse3D(false);
        }
      })();
    } else if (!use3D) {
      const id = window.setInterval(() => {
        setFallbackTick(Math.floor(Math.random() * 20) + 1);
      }, 80);
      return () => window.clearInterval(id);
    }
  }, [rolling, value, use3D, onRollVisualComplete, settled]);

  if (use3D) {
    return (
      <div className="d20-card">
        <div
          id="dice-scene"
          ref={containerRef}
          className="relative w-full"
          style={{ height: '200px', minHeight: '200px' }}
        />
        {settled && value != null && (
          <div className="text-center pb-4 animate-d20-fade-in">
            <p
              className="text-3xl font-black text-white tabular-nums font-mono"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
            >
              {value}
            </p>
            {band && (
              <p className={`text-sm font-semibold mt-0.5 ${bandColor(band)}`}>
                {bandLabel(band)}
              </p>
            )}
          </div>
        )}
        {rolling && !settled && (
          <p className="text-center pb-4 text-sm text-white/50 animate-pulse">Rolling...</p>
        )}
      </div>
    );
  }

  const display = rolling ? (fallbackTick ?? '—') : (value ?? '—');
  const isFallbackSettled = !rolling && value != null;

  return (
    <div className="d20-card">
      <div className="relative flex flex-col items-center py-6">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] w-32 h-16 rounded-full blur-2xl transition-opacity duration-500 ${
            isFallbackSettled ? 'opacity-50' : 'opacity-30'
          }`}
          style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.6), transparent 70%)' }}
        />
        <div
          className={`relative w-32 h-32 ${rolling ? 'animate-d20-tumble' : isFallbackSettled ? 'animate-d20-settle' : ''}`}
          style={{ perspective: '600px', transformStyle: 'preserve-3d' }}
        >
          <div
            className="absolute inset-0"
            style={{
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 40%, #92400e 100%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              background: 'linear-gradient(170deg, rgba(255,255,255,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.2) 100%)',
            }}
          />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128" fill="none">
            <polygon points="64,0 128,49 105,128 23,128 0,49" fill="none" stroke="rgba(120,53,15,0.3)" strokeWidth="1" />
            <line x1="64" y1="0" x2="64" y2="76" stroke="rgba(120,53,15,0.2)" strokeWidth="0.75" />
            <line x1="0" y1="49" x2="105" y2="128" stroke="rgba(120,53,15,0.15)" strokeWidth="0.75" />
            <line x1="128" y1="49" x2="23" y2="128" stroke="rgba(120,53,15,0.15)" strokeWidth="0.75" />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-4xl font-black tabular-nums text-white z-10 font-mono"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)', paddingBottom: '0.15em' }}
          >
            {display}
          </span>
        </div>
        {isFallbackSettled && (
          <div className="mt-4 text-center animate-d20-fade-in">
            <p className="text-3xl font-black text-white tabular-nums font-mono" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
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
