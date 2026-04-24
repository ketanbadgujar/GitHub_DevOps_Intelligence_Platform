// ─── DORA Performance Bands ───────────────────────────────────────────────────
// Based on DORA 2023 State of DevOps Report benchmarks

export const DORA_BANDS = {
  deployment_frequency: {
    // deploys/day
    elite:  { min: 1,    label: 'Elite',    color: '#34d399' },
    high:   { min: 0.14, label: 'High',     color: '#22d3ee' }, // ~1/week
    medium: { min: 0.03, label: 'Medium',   color: '#fbbf24' }, // ~1/month
    low:    { min: 0,    label: 'Low',      color: '#fb7185' },
  },
  lead_time_hours: {
    elite:  { max: 1,    label: 'Elite',    color: '#34d399' },
    high:   { max: 168,  label: 'High',     color: '#22d3ee' }, // 1 week
    medium: { max: 720,  label: 'Medium',   color: '#fbbf24' }, // 1 month
    low:    { max: Infinity, label: 'Low',  color: '#fb7185' },
  },
  change_failure_rate: {
    elite:  { max: 5,    label: 'Elite',    color: '#34d399' },
    high:   { max: 10,   label: 'High',     color: '#22d3ee' },
    medium: { max: 15,   label: 'Medium',   color: '#fbbf24' },
    low:    { max: 100,  label: 'Low',      color: '#fb7185' },
  },
  mttr_hours: {
    elite:  { max: 1,    label: 'Elite',    color: '#34d399' },
    high:   { max: 24,   label: 'High',     color: '#22d3ee' },
    medium: { max: 168,  label: 'Medium',   color: '#fbbf24' },
    low:    { max: Infinity, label: 'Low',  color: '#fb7185' },
  },
};

export function classifyDora(metric, value) {
  const band = DORA_BANDS[metric];
  if (!band) return { label: 'Unknown', color: '#64748b' };
  if (metric === 'deployment_frequency') {
    if (value >= band.elite.min)  return band.elite;
    if (value >= band.high.min)   return band.high;
    if (value >= band.medium.min) return band.medium;
    return band.low;
  } else {
    if (value <= band.elite.max)  return band.elite;
    if (value <= band.high.max)   return band.high;
    if (value <= band.medium.max) return band.medium;
    return band.low;
  }
}

// ─── Risk Score Helpers ───────────────────────────────────────────────────────
export function riskColor(score) {
  if (score >= 0.8) return '#fb7185';
  if (score >= 0.6) return '#fbbf24';
  if (score >= 0.4) return '#22d3ee';
  return '#34d399';
}

export function riskLabel(score) {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
}

export function riskBg(label) {
  const map = {
    CRITICAL: 'rgba(251,113,133,0.12)',
    HIGH:     'rgba(251,191,36,0.12)',
    MEDIUM:   'rgba(34,211,238,0.12)',
    LOW:      'rgba(52,211,153,0.12)',
  };
  return map[label] || 'rgba(100,116,139,0.12)';
}

export function riskTextColor(label) {
  const map = {
    CRITICAL: '#fb7185',
    HIGH:     '#fbbf24',
    MEDIUM:   '#22d3ee',
    LOW:      '#34d399',
  };
  return map[label] || '#64748b';
}

// ─── Burnout Helpers ──────────────────────────────────────────────────────────
export function burnoutColor(score) {
  if (score >= 0.75) return '#fb7185';
  if (score >= 0.5)  return '#fbbf24';
  if (score >= 0.25) return '#22d3ee';
  return '#34d399';
}

export function burnoutLabel(score) {
  if (score >= 0.75) return 'CRITICAL';
  if (score >= 0.5)  return 'HIGH';
  if (score >= 0.25) return 'MEDIUM';
  return 'HEALTHY';
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function fmt(n, decimals = 1) {
  if (n == null) return '—';
  return Number(n).toFixed(decimals);
}

export function fmtDuration(hours) {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${fmt(hours)}h`;
  return `${fmt(hours / 24)}d`;
}

export function fmtPercent(n) {
  if (n == null) return '—';
  return `${fmt(n)}%`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ─── Avatar initials ──────────────────────────────────────────────────────────
export function initials(name = '') {
  return name.split(/[._-\s]/).map(s => s[0]).join('').toUpperCase().slice(0, 2);
}

export function avatarColor(name = '') {
  const colors = ['#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#60a5fa'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}
