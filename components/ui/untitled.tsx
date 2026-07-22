'use client';

/** Untitled UI–inspired primitives, themed for CORRIDOR / ECHOVOID (no Tailwind v4 dependency). */

import type { ReactNode } from 'react';

const AVATAR_PALETTES = [
  'bg-[#e0e7ff] text-[#3730a3]',
  'bg-[#cffafe] text-[#0e7490]',
  'bg-[#fce7f3] text-[#9d174d]',
  'bg-[#d1fae5] text-[#065f46]',
  'bg-[#ffedd5] text-[#9a3412]',
  'bg-[#e2e8f0] text-[#334155]',
];

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-lg',
} as const;

export function Avatar({
  name,
  size = 'md',
  status,
  className = '',
}: {
  name: string;
  size?: keyof typeof sizeMap;
  status?: 'online' | 'offline';
  className?: string;
}) {
  const palette = AVATAR_PALETTES[hashName(name) % AVATAR_PALETTES.length];
  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        className={`${sizeMap[size]} ${palette} inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-[var(--theme-surface)]`}
        aria-hidden
      >
        {initials(name)}
      </span>
      {status && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--theme-surface)] ${
            status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
        />
      )}
    </span>
  );
}

export function AvatarLabelGroup({
  name,
  subtitle,
  meta,
  size = 'md',
  trailing,
}: {
  name: string;
  subtitle?: string;
  meta?: string;
  size?: keyof typeof sizeMap;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar name={name} size={size} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--theme-text)] truncate">{name}</p>
        {subtitle && (
          <p className="text-sm text-[var(--theme-muted)] truncate">{subtitle}</p>
        )}
        {meta && (
          <p className="text-xs text-[var(--theme-muted)] truncate mt-0.5">{meta}</p>
        )}
      </div>
      {trailing}
    </div>
  );
}

type BadgeColor = 'gray' | 'brand' | 'success' | 'warning' | 'error' | 'blue';

const badgeColors: Record<BadgeColor, string> = {
  gray: 'bg-[var(--theme-surface-muted)] text-[var(--theme-muted)] ring-[var(--theme-border)]',
  brand:
    'bg-[color-mix(in_srgb,var(--theme-ink)_10%,transparent)] text-[var(--theme-ink)] ring-[color-mix(in_srgb,var(--theme-ink)_20%,transparent)]',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  error: 'bg-rose-50 text-rose-700 ring-rose-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
};

export function Badge({
  children,
  color = 'gray',
  size = 'sm',
  dot,
  className = '',
}: {
  children: ReactNode;
  color?: BadgeColor;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${
        badgeColors[color]
      } ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            color === 'success'
              ? 'bg-emerald-500'
              : color === 'error'
              ? 'bg-rose-500'
              : color === 'warning'
              ? 'bg-amber-500'
              : color === 'blue' || color === 'brand'
              ? 'bg-[var(--theme-signal)]'
              : 'bg-[var(--theme-muted)]'
          }`}
        />
      )}
      {children}
    </span>
  );
}

export function FeaturedIcon({
  children,
  color = 'brand',
}: {
  children: ReactNode;
  color?: 'brand' | 'gray' | 'success';
}) {
  const colors = {
    brand: 'bg-[color-mix(in_srgb,var(--theme-ink)_8%,transparent)] text-[var(--theme-ink)]',
    gray: 'bg-[var(--theme-surface-muted)] text-[var(--theme-muted)]',
    success: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span
      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${colors[color]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center text-center !py-10 !px-6 animate-slide-up">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-base font-semibold text-[var(--theme-text)]">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-[var(--theme-muted)] max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
}) {
  return (
    <div className="card !p-4 !shadow-none hover:shadow-soft transition-shadow">
      <p className="text-xs font-medium text-[var(--theme-muted)] truncate">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--theme-ink)] font-display tabular-nums">
        {value}
      </p>
      {(hint || trend) && (
        <p className="mt-1 text-xs text-[var(--theme-muted)]">
          {trend && <span className="text-emerald-600 font-medium mr-1">{trend}</span>}
          {hint}
        </p>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className="px-4 py-4 border-b"
      style={{
        borderColor: 'var(--theme-border)',
        background: 'color-mix(in srgb, var(--theme-surface) 94%, transparent)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="surface-shell !px-0 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title text-xl !mt-0">{title}</h1>
          {subtitle && <p className="page-subtitle mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function ListRow({
  children,
  onClick,
  href,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const base = `card !p-3.5 !shadow-none hover:bg-[var(--theme-surface-muted)] transition-colors ${className}`;
  if (href) {
    return (
      <a href={href} className={`block ${base}`}>
        {children}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full text-left ${base}`}>
        {children}
      </button>
    );
  }
  return <div className={base}>{children}</div>;
}
