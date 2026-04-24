import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { Activity, Info } from 'lucide-react';
import { MetricCard, SectionHeader, Badge } from '../components/UI';
import {
  classifyDora, fmt, fmtDuration, fmtPercent, fmtDate
} from '../utils/format';

const PERIOD_OPTIONS = [7, 14, 30, 60, 90];

const METRIC_INFO = {
  deployment_frequency: {
    title: 'Deployment Frequency',
    description: 'How often code is deployed to production. Elite teams deploy multiple times per day.',
    unit: 'deploys/day',
    color: '#22d3ee',
    field: 'deployment_frequency',
    doraField: 'deployment_frequency',
  },
  lead_time: {
    title: 'Lead Time for Changes',
    description: 'Time from code commit to production deployment. Measures development velocity.',
    unit: 'hours',
    color: '#34d399',
    field: 'lead_time_hours',
    doraField: 'lead_time_hours',
  },
  cfr: {
    title: 'Change Failure Rate',
    description: 'Percentage of deployments that result in incidents or rollbacks.',
    unit: '%',
    color: '#fbbf24',
    field: 'cfr',
    doraField: 'change_failure_rate',
  },
  mttr: {
    title: 'Mean Time to Restore',
    description: 'How quickly failures are recovered from. Critical for service reliability.',
    unit: 'hours',
    color: '#fb7185',
    field: 'mttr_hours',
    doraField: 'mttr_hours',
  },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="text-slate-400 text-xs mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function DoraPage({ metrics, history, loading }) {
  const [days, setDays] = useState(30);

  const slicedHistory = useMemo(() =>
    (history || []).slice(-days).map(d => ({
      date: fmtDate(d.date),
      'Deploys/day': +fmt(d.deployment_frequency),
      'Lead Time (h)': +fmt(d.lead_time_hours),
      'CFR %': +fmt(d.cfr),
      'MTTR (h)': +fmt(d.mttr_hours),
    })),
    [history, days]
  );

  const m = metrics || {};

  const cards = [
    { label: 'Deployment Frequency', value: fmt(m.deployment_frequency), unit: '/day', band: classifyDora('deployment_frequency', m.deployment_frequency), glowColor: 'cyan' },
    { label: 'Lead Time for Changes', value: fmtDuration(m.lead_time_for_changes), unit: '', band: classifyDora('lead_time_hours', m.lead_time_for_changes), glowColor: 'emerald' },
    { label: 'Change Failure Rate', value: fmtPercent(m.change_failure_rate), unit: '', band: classifyDora('change_failure_rate', m.change_failure_rate), glowColor: 'amber' },
    { label: 'Mean Time to Restore', value: fmtDuration(m.mean_time_to_restore), unit: '', band: classifyDora('mttr_hours', m.mean_time_to_restore), glowColor: 'rose' },
  ];

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <SectionHeader icon={Activity} title="DORA Metrics" subtitle="DevOps Research & Assessment benchmarks" />
        <div className="flex items-center gap-1 bg-base-800 border border-base-700 rounded-lg p-1">
          {PERIOD_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                days === d
                  ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >{d}d</button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <MetricCard key={i} {...c} loading={loading} />
        ))}
      </div>

      {/* Performance classification */}
      <div className="card p-5">
        <div className="label mb-4">DORA Performance Classification</div>
        <div className="grid grid-cols-4 gap-3">
          {['Elite', 'High', 'Medium', 'Low'].map((tier, i) => {
            const colors = ['#34d399', '#22d3ee', '#fbbf24', '#fb7185'];
            const descs = [
              'On-demand, multiple times per day',
              'Once per day to once per week',
              'Once per week to once per month',
              'Less than once per month',
            ];
            const active = m.performance_level === tier;
            return (
              <div key={tier}
                className={`p-3 rounded-lg border transition-all ${active ? 'border-current' : 'border-base-600'}`}
                style={active ? { borderColor: colors[i], background: `${colors[i]}10` } : {}}>
                <div className="font-mono text-xs font-semibold mb-1" style={{ color: colors[i] }}>{tier}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{descs[i]}</div>
                {active && (
                  <div className="mt-2 text-xs font-mono" style={{ color: colors[i] }}>← Current</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Deployment Frequency */}
        <div className="card card-glow-cyan p-5">
          <div className="label mb-4">Deployment Frequency (deploys/day)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={slicedHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradDF" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={1} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'Elite', fill: '#34d399', fontSize: 9 }} />
              <Area type="monotone" dataKey="Deploys/day" stroke="#22d3ee" fill="url(#gradDF)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Time */}
        <div className="card card-glow-emerald p-5">
          <div className="label mb-4">Lead Time for Changes (hours)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={slicedHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={24} stroke="#34d399" strokeDasharray="4 4" />
              <Bar dataKey="Lead Time (h)" fill="#34d399" radius={[3,3,0,0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Change Failure Rate */}
        <div className="card card-glow-amber p-5">
          <div className="label mb-4">Change Failure Rate (%)</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={slicedHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={5} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'Elite ≤5%', fill: '#34d399', fontSize: 9 }} />
              <Line type="monotone" dataKey="CFR %" stroke="#fbbf24" strokeWidth={2} dot={{ fill: '#fbbf24', r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* MTTR */}
        <div className="card card-glow-rose p-5">
          <div className="label mb-4">Mean Time to Restore (hours)</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={slicedHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMTTR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={1} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'Elite ≤1h', fill: '#34d399', fontSize: 9 }} />
              <Area type="monotone" dataKey="MTTR (h)" stroke="#fb7185" fill="url(#gradMTTR)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
