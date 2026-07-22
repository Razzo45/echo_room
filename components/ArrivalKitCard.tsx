'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, FeaturedIcon } from '@/components/ui/untitled';

type KitItem = { id: string; label: string; done: boolean; href: string };

/** Finite pre-event checklist — recognition, not grind. */
export default function ArrivalKitCard() {
  const [items, setItems] = useState<KitItem[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [total, setTotal] = useState(4);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/arrival-kit')
      .then((r) => r.json())
      .then((data) => {
        if (data.items) {
          setItems(data.items);
          setDoneCount(data.doneCount);
          setTotal(data.total);
          setComplete(!!data.complete);
          setMessage(data.message);
        }
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="card !p-5 relative overflow-hidden">
      <div className="flex items-start gap-3 mb-4">
        <FeaturedIcon color={complete ? 'success' : 'brand'}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </FeaturedIcon>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-[var(--theme-ink)]">Arrival kit</h2>
            <Badge color={complete ? 'success' : 'gray'} size="sm">
              {doneCount}/{total}
            </Badge>
          </div>
          <p className="text-xs text-[var(--theme-muted)] mt-0.5">
            Finite prep for this event — not a battle pass.
          </p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-[var(--theme-surface-muted)] mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--theme-ink)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {complete && message ? (
        <p className="text-sm text-corridor-signal font-medium">{message}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 text-sm rounded-lg px-2 py-2 -mx-2 hover:bg-[var(--theme-surface-muted)] transition-colors ${
                  item.done ? 'text-[var(--theme-muted)]' : 'text-[var(--theme-text)]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                    item.done
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-[var(--theme-surface-muted)] text-[var(--theme-muted)] ring-1 ring-[var(--theme-border)]'
                  }`}
                  aria-hidden
                >
                  {item.done ? '✓' : ''}
                </span>
                <span className={item.done ? 'line-through' : ''}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
