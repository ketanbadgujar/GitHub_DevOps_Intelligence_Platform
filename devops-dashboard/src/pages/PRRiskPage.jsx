import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell
} from 'recharts';
import { GitPullRequest, ArrowUpDown, Filter } from 'lucide-react';
import { SectionHeader, Avatar, Badge, ProgressBar, ScoreRing } from '../components/UI';
import {
  riskColor, riskLabel, riskTextColor, riskBg, fmt, avatarColor, initials
} from '../utils/format';

const RISK_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="custom-tooltip">
      <div className="font-semibold text-slate-200">PR #{d?.pr_number}</div>
      <div className="text-slate-400 text-xs mt-1 mb-2 max-w-48 leading-relaxed">{d?.title}</div>
      <div style={{ color: riskColor(d?.risk_score) }}>Risk: {fmt(d?.risk_score * 100, 0)}%</div>
      <div className="text-slate-400">Files: {d?.files_changed}</div>
      <div className="text-slate-400">Lines: +{d?.lines_added}</div>
    </div>
  );
};

function RiskDistributionChart({ data }) {
  const buckets = [
    { range: '0–20', count: 0, color: '#34d399' },
    { range: '20–40', count: 0, color: '#22d3ee' },
    { range: '40–60', count: 0, color: '#fbbf24' },
    { range: '60–80', count: 0, color: '#f97316' },
    { range: '80–100', count: 0, color: '#fb7185' },
  ];
  (data || []).forEach(pr => {
    const pct = (pr.risk_score || 0) * 100;
    const i = Math.min(4, Math.floor(pct / 20));
    buckets[i].count++;
  });
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={buckets} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} allowDecimals={false} />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.[0] ? (
              <div className="custom-tooltip">{payload[0].payload.range}%: {payload[0].value} PRs</div>
            ) : null
          }
        />
        <Bar dataKey="count" radius={[3,3,0,0]}>
          {buckets.map((b, i) => <Cell key={i} fill={b.color} fillOpacity={0.8} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function PRRiskPage({ prRisk, loading }) {
  const [filter, setFilter] = useState('ALL');
  const [sortField, setSortField] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => {
    let list = (prRisk || []);
    if (filter !== 'ALL') list = list.filter(p => (p.risk_label || riskLabel(p.risk_score)) === filter);
    if (search) list = list.filter(p =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.author?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.pr_number).includes(search)
    );
    return [...list].sort((a, b) => {
      const av = a[sortField] ?? 0, bv = b[sortField] ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [prRisk, filter, sortField, sortDir, search]);

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  }

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    (prRisk || []).forEach(p => {
      const l = p.risk_label || riskLabel(p.risk_score);
      if (c[l] !== undefined) c[l]++;
    });
    return c;
  }, [prRisk]);

  const avgRisk = useMemo(() => {
    if (!prRisk?.length) return 0;
    return prRisk.reduce((s, p) => s + (p.risk_score || 0), 0) / prRisk.length;
  }, [prRisk]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <SectionHeader
        icon={GitPullRequest}
        title="PR Risk Analysis"
        subtitle="XGBoost classifier — trained on historical merge outcomes"
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-4 col-span-2 lg:col-span-1 flex flex-col items-center justify-center">
          <ScoreRing value={avgRisk} max={1} color={riskColor(avgRisk)} size={72} label={`${fmt(avgRisk * 100, 0)}%`} />
          <div className="label mt-3 text-center">Avg Risk</div>
        </div>
        {Object.entries(counts).map(([label, count]) => {
          const color = riskTextColor(label);
          return (
            <div key={label} className="card p-4" style={{ borderColor: `${color}20` }}>
              <div className="label mb-1">{label}</div>
              <div className="font-mono text-2xl font-semibold" style={{ color }}>{count}</div>
              <div className="text-xs text-slate-500 mt-0.5">pull requests</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution chart */}
        <div className="card p-5">
          <div className="label mb-3">Risk Score Distribution</div>
          <RiskDistributionChart data={prRisk} />
        </div>

        {/* Top high-risk */}
        <div className="card p-5 lg:col-span-2">
          <div className="label mb-3">Top Risk Features</div>
          <div className="space-y-2">
            {(prRisk || []).filter(p => p.risk_score >= 0.7).slice(0, 5).map(pr => {
              const color = riskColor(pr.risk_score);
              return (
                <div key={pr.pr_number} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500 w-12 flex-shrink-0">#{pr.pr_number}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-300 truncate mb-1">{pr.title}</div>
                    <ProgressBar value={pr.risk_score} max={1} color={color} height={3} />
                  </div>
                  <span className="font-mono text-xs w-10 text-right flex-shrink-0" style={{ color }}>
                    {fmt(pr.risk_score * 100, 0)}%
                  </span>
                </div>
              );
            })}
            {(prRisk || []).filter(p => p.risk_score >= 0.7).length === 0 && (
              <p className="text-sm text-slate-500 font-mono text-center py-4">No PRs with risk ≥ 70%</p>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-base-700 flex items-center gap-3">
          <Filter size={13} className="text-slate-500" />
          <div className="flex items-center gap-1 flex-wrap">
            {RISK_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                  filter === f
                    ? f === 'ALL' ? 'bg-slate-500/20 text-slate-200' : ''
                    : 'text-slate-500 hover:text-slate-300'
                }`}
                style={filter === f && f !== 'ALL' ? {
                  background: riskBg(f),
                  color: riskTextColor(f),
                  border: `1px solid ${riskTextColor(f)}30`,
                } : {}}
              >{f}</button>
            ))}
          </div>
          <div className="flex-1" />
          <input
            type="text"
            placeholder="Search PRs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-base-700 border border-base-600 rounded-lg px-3 py-1.5 text-xs font-mono
              text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 w-48"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-700">
                {[
                  { label: 'PR', field: 'pr_number', w: 'w-16' },
                  { label: 'Title', field: null, w: 'min-w-64' },
                  { label: 'Author', field: 'author', w: 'w-28' },
                  { label: 'Files', field: 'files_changed', w: 'w-16' },
                  { label: 'Lines', field: 'lines_added', w: 'w-16' },
                  { label: 'Risk Score', field: 'risk_score', w: 'w-32' },
                  { label: 'Label', field: null, w: 'w-24' },
                ].map(({ label, field, w }) => (
                  <th key={label}
                    onClick={field ? () => toggleSort(field) : undefined}
                    className={`px-4 py-3 text-left ${w} ${field ? 'cursor-pointer hover:text-slate-200' : ''}`}
                  >
                    <span className="flex items-center gap-1 label">
                      {label}
                      {field && <ArrowUpDown size={10} className={sortField === field ? 'text-cyan-400' : 'text-slate-600'} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="border-b border-base-700/50">
                    {[1,2,3,4,5,6,7].map(j => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-mono text-sm">No PRs match filter</td></tr>
              ) : sorted.map(pr => {
                const rl = pr.risk_label || riskLabel(pr.risk_score);
                const rc = riskTextColor(rl);
                const ac = avatarColor(pr.author);
                return (
                  <tr key={pr.pr_number}
                    className="border-b border-base-700/30 hover:bg-base-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">#{pr.pr_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-200 max-w-xs truncate">{pr.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={pr.author} color={ac} size={6} />
                        <span className="text-xs text-slate-300 font-mono">{pr.author}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{pr.files_changed}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">+{pr.lines_added}</td>
                    <td className="px-4 py-3 w-32">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={pr.risk_score} max={1} color={riskColor(pr.risk_score)} height={3} animate={false} />
                        <span className="font-mono text-xs w-8 text-right flex-shrink-0" style={{ color: riskColor(pr.risk_score) }}>
                          {fmt(pr.risk_score * 100, 0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge text-xs" style={{ background: riskBg(rl), color: rc, border: `1px solid ${rc}30` }}>
                        {rl}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-base-700/50 text-xs text-slate-500 font-mono">
          {sorted.length} of {prRisk?.length || 0} pull requests
        </div>
      </div>
    </div>
  );
}
