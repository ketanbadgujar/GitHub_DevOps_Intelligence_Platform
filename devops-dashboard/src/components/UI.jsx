import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── MetricCard ───────────────────────────────────────────────────────────────
export function MetricCard({ label, value, unit, band, trend, trendValue, loading, children, glowColor = 'cyan', className = '' }) {
  const glowClass = {
    cyan:    'card-glow-cyan',
    amber:   'card-glow-amber',
    rose:    'card-glow-rose',
    emerald: 'card-glow-emerald',
  }[glowColor] || 'card-glow-cyan';

  return (
    <div className={`card ${glowClass} p-5 animate-slide-up ${className}`}>
      <div className="label mb-3">{label}</div>
      {loading ? (
        <div className="skeleton h-9 w-32 mb-2" />
      ) : (
        <div className="flex items-end gap-2 mb-1">
          <span className="metric-value" style={{ color: band?.color || '#e2e8f0' }}>
            {value}
          </span>
          {unit && <span className="text-slate-500 font-mono text-sm mb-1">{unit}</span>}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        {band && !loading && (
          <span
            className="badge"
            style={{ background: `${band.color}18`, color: band.color, border: `1px solid ${band.color}30` }}
          >
            ◆ {band.label}
          </span>
        )}
        {trend && !loading && (
          <TrendIndicator direction={trend} value={trendValue} />
        )}
      </div>
      {children}
    </div>
  );
}

// ─── TrendIndicator ───────────────────────────────────────────────────────────
export function TrendIndicator({ direction, value, inverted = false }) {
  const isUp = direction === 'up';
  const isGood = inverted ? !isUp : isUp;
  const color = isGood ? '#34d399' : '#fb7185';
  const Icon = isUp ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  return (
    <span className="flex items-center gap-1 text-xs font-mono" style={{ color }}>
      <Icon size={12} />
      {value}
    </span>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, color = '#22d3ee' }) {
  return (
    <span
      className="badge"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {children}
    </span>
  );
}

// ─── StatusDot ────────────────────────────────────────────────────────────────
export function StatusDot({ status }) {
  const config = {
    up:      { color: '#34d399', pulse: true,  label: 'Up' },
    healthy: { color: '#34d399', pulse: true,  label: 'Healthy' },
    down:    { color: '#fb7185', pulse: false, label: 'Down' },
    error:   { color: '#fb7185', pulse: false, label: 'Error' },
    warn:    { color: '#fbbf24', pulse: true,  label: 'Warning' },
    unknown: { color: '#64748b', pulse: false, label: 'Unknown' },
  }[status?.toLowerCase()] || { color: '#64748b', pulse: false, label: status };

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`status-dot ${config.pulse ? 'animate-pulse-slow' : ''}`}
        style={{ backgroundColor: config.color, boxShadow: `0 0 6px ${config.color}` }}
      />
      <span className="text-xs font-mono" style={{ color: config.color }}>{config.label}</span>
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 8, color = '#22d3ee' }) {
  const initials = name.split(/[._\-\s]/).map(s => s[0]).join('').toUpperCase().slice(0, 2);
  const px = size * 4;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-mono font-semibold flex-shrink-0"
      style={{
        width: px, height: px, fontSize: px * 0.35,
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {initials}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="p-2 rounded-lg bg-base-700 text-cyan-400">
            <Icon size={16} />
          </span>
        )}
        <div>
          <h2 className="font-display text-base font-semibold text-slate-100">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-600">
      {Icon && <Icon size={32} className="mb-3 opacity-40" />}
      <p className="text-sm font-mono">{message}</p>
    </div>
  );
}

// ─── MockBadge ────────────────────────────────────────────────────────────────
export function MockBadge() {
  return (
    <span className="badge text-amber-400 border border-amber-400/30 bg-amber-400/10 gap-1">
      ⚡ mock data
    </span>
  );
}

// ─── RefreshButton ────────────────────────────────────────────────────────────
export function RefreshButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="p-1.5 rounded-lg hover:bg-base-700 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-40"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={loading ? 'animate-spin' : ''}>
        <path d="M21 12a9 9 0 11-3.22-6.94L21 8M21 3v5h-5"/>
      </svg>
    </button>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 1, color = '#22d3ee', height = 4, animate = true }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: '#1e2535' }}>
      <div
        className={animate ? 'transition-all duration-700 ease-out' : ''}
        style={{ width: `${pct}%`, height, background: color, boxShadow: `0 0 8px ${color}60` }}
      />
    </div>
  );
}

// ─── Score Ring (SVG) ────────────────────────────────────────────────────────
export function ScoreRing({ value, max = 1, color = '#22d3ee', size = 56, label }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  const dash = pct * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2535" strokeWidth="5" />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ filter: `drop-shadow(0 0 4px ${color}80)`, transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span className="absolute font-mono text-xs font-semibold" style={{ color }}>
        {label || `${Math.round(pct * 100)}%`}
      </span>
    </div>
  );
}
