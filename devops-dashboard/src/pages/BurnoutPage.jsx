import React, { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { Users, Heart, AlertTriangle, TrendingDown } from 'lucide-react';
import { SectionHeader, Avatar, ProgressBar, ScoreRing, Badge } from '../components/UI';
import {
  burnoutColor, burnoutLabel, fmt, avatarColor, riskBg
} from '../utils/format';

const RISK_LABELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'HEALTHY'];
const LABEL_COLORS = {
  CRITICAL: '#fb7185',
  HIGH:     '#fbbf24',
  MEDIUM:   '#22d3ee',
  HEALTHY:  '#34d399',
};

function BurnoutCard({ contributor: c, selected, onClick }) {
  const color = burnoutColor(c.burnout_score);
  const label = burnoutLabel(c.burnout_score);
  const ac = avatarColor(c.contributor);

  return (
    <div
      onClick={onClick}
      className={`card p-4 cursor-pointer transition-all ${
        selected ? 'ring-1' : 'hover:border-base-600'
      }`}
      style={selected ? { ringColor: color, borderColor: `${color}40`, background: `${color}08` } : {}}
    >
      <div className="flex items-start gap-3">
        <ScoreRing value={c.burnout_score} max={1} color={color} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Avatar name={c.contributor} color={ac} size={6} />
            <span className="font-mono text-sm font-medium text-slate-200 truncate">{c.contributor}</span>
          </div>
          <span className="badge text-xs" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
            {label}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500 font-mono">Burnout Score</span>
            <span className="font-mono" style={{ color }}>{fmt(c.burnout_score * 100, 0)}%</span>
          </div>
          <ProgressBar value={c.burnout_score} max={1} color={color} height={3} />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: 'Commits', value: c.commits_30d },
            { label: 'Reviews', value: `${fmt(c.review_hours, 0)}h` },
            { label: 'Weekends', value: c.weekend_commits },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="font-mono text-sm font-semibold text-slate-200">{stat.value}</div>
              <div className="text-[10px] text-slate-500 font-mono">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContributorDetail({ c }) {
  const color = burnoutColor(c.burnout_score);
  const label = burnoutLabel(c.burnout_score);
  const ac = avatarColor(c.contributor);

  const radarData = [
    { metric: 'Commit Rate', value: Math.min(100, (c.commits_30d / 200) * 100) },
    { metric: 'Review Hours', value: Math.min(100, (c.review_hours / 40) * 100) },
    { metric: 'Weekend Work', value: Math.min(100, (c.weekend_commits / 30) * 100) },
    { metric: 'Anomaly', value: Math.min(100, Math.abs(c.anomaly_score || 0) * 100) },
    { metric: 'Burnout Risk', value: Math.min(100, c.burnout_score * 100) },
  ];

  const recommendations = {
    CRITICAL: [
      '🚨 Immediate manager check-in required',
      '📅 Force-schedule time off in next 2 weeks',
      '🔀 Redistribute active PR reviews to teammates',
      '⏰ Enforce no-commit hours (evenings & weekends)',
    ],
    HIGH: [
      '⚠️ Schedule 1:1 conversation this week',
      '📊 Review workload and reassign some tasks',
      '🗓️ Encourage taking planned PTO',
      '🔔 Monitor weekend commit patterns',
    ],
    MEDIUM: [
      '💬 Check in at next regular 1:1',
      '📈 Watch trends over next 2 weeks',
      '✅ Ensure workload is sustainable',
    ],
    HEALTHY: [
      '✅ Contributor appears healthy',
      '📊 Continue regular monitoring',
      '🎉 Recognize sustainable work patterns',
    ],
  }[label] || [];

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={c.contributor} color={ac} size={12} />
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-100">{c.contributor}</h3>
          <span className="badge mt-1" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
            {label} BURNOUT RISK
          </span>
        </div>
        <div className="ml-auto">
          <ScoreRing value={c.burnout_score} max={1} color={color} size={72} />
        </div>
      </div>

      {/* Radar chart */}
      <div>
        <div className="label mb-3">Risk Factor Breakdown</div>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#1e2535" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
            <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '30-day Commits', value: c.commits_30d, color: '#22d3ee' },
          { label: 'Review Hours', value: `${fmt(c.review_hours)}h`, color: '#34d399' },
          { label: 'Weekend Commits', value: c.weekend_commits, color: '#fbbf24' },
          { label: 'Anomaly Score', value: fmt(c.anomaly_score, 2), color: '#fb7185' },
        ].map(s => (
          <div key={s.label} className="bg-base-700/50 rounded-lg p-3">
            <div className="label mb-1">{s.label}</div>
            <div className="font-mono text-xl font-semibold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div>
        <div className="label mb-3">Recommended Actions</div>
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BurnoutPage({ burnout, loading }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const sorted = useMemo(() =>
    [...(burnout || [])].sort((a, b) => b.burnout_score - a.burnout_score),
    [burnout]
  );

  const filtered = useMemo(() =>
    filter === 'ALL' ? sorted : sorted.filter(c => burnoutLabel(c.burnout_score) === filter),
    [sorted, filter]
  );

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, HEALTHY: 0 };
    (burnout || []).forEach(b => {
      const l = burnoutLabel(b.burnout_score);
      if (c[l] !== undefined) c[l]++;
    });
    return c;
  }, [burnout]);

  const selectedContributor = useMemo(() =>
    burnout?.find(c => c.contributor === selected),
    [burnout, selected]
  );

  const teamHealth = useMemo(() => {
    if (!burnout?.length) return 0;
    const avg = burnout.reduce((s, c) => s + c.burnout_score, 0) / burnout.length;
    return 1 - avg;
  }, [burnout]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <SectionHeader
        icon={Users}
        title="Contributor Health"
        subtitle="Isolation Forest anomaly detection on commit patterns"
      />

      {/* Team health summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-4 col-span-2 lg:col-span-1 flex flex-col items-center justify-center">
          <ScoreRing
            value={teamHealth} max={1}
            color={burnoutColor(1 - teamHealth)} size={72}
            label={`${fmt(teamHealth * 100, 0)}%`}
          />
          <div className="label mt-3 text-center">Team Health</div>
        </div>
        {Object.entries(counts).map(([label, count]) => {
          const color = LABEL_COLORS[label];
          return (
            <div key={label} className="card p-4" style={{ borderColor: `${color}20` }}>
              <div className="label mb-1">{label}</div>
              <div className="font-mono text-2xl font-semibold" style={{ color }}>{count}</div>
              <div className="text-xs text-slate-500 mt-0.5">contributors</div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {['ALL', ...RISK_LABELS].map(f => {
          const color = f === 'ALL' ? '#64748b' : LABEL_COLORS[f];
          return (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelected(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={filter === f ? {
                background: `${color}18`, color, border: `1px solid ${color}30`
              } : { color: '#64748b', border: '1px solid transparent' }}
            >{f} {f !== 'ALL' && `(${counts[f]})`}</button>
          );
        })}
      </div>

      {/* Grid + Detail */}
      <div className={`grid gap-6 ${selectedContributor ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {/* Cards */}
        <div className={`${selectedContributor ? 'lg:col-span-2' : 'lg:col-span-3'} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 content-start`}>
          {loading ? (
            [1,2,3,4,5,6].map(i => (
              <div key={i} className="card p-4 space-y-3">
                <div className="skeleton h-14 w-14 rounded-full" />
                <div className="skeleton h-4 w-24 rounded" />
                <div className="skeleton h-3 w-full rounded" />
              </div>
            ))
          ) : filtered.map(c => (
            <BurnoutCard
              key={c.contributor}
              contributor={c}
              selected={selected === c.contributor}
              onClick={() => setSelected(selected === c.contributor ? null : c.contributor)}
            />
          ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500 font-mono text-sm">
              No contributors match filter
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedContributor && (
          <div className="lg:col-span-1">
            <ContributorDetail c={selectedContributor} />
          </div>
        )}
      </div>
    </div>
  );
}
