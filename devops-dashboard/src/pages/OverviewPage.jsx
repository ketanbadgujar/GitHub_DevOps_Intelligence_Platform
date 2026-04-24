import React, { useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity, GitPullRequest, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { MetricCard, SectionHeader, Badge, Avatar, ProgressBar, SkeletonCard } from '../components/UI';
import {
  classifyDora, riskColor, riskLabel, riskTextColor, riskBg,
  burnoutColor, burnoutLabel, fmt, fmtDuration, fmtPercent, fmtDate, avatarColor
} from '../utils/format';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function OverviewPage({ doraMetrics, doraHistory, prRisk, burnout, loading }) {
  const doraCards = useMemo(() => {
    if (!doraMetrics) return [];
    return [
      {
        label: 'Deployment Frequency',
        value: fmt(doraMetrics.deployment_frequency),
        unit: '/day',
        band: classifyDora('deployment_frequency', doraMetrics.deployment_frequency),
        glowColor: 'cyan',
      },
      {
        label: 'Lead Time for Changes',
        value: fmtDuration(doraMetrics.lead_time_for_changes),
        unit: '',
        band: classifyDora('lead_time_hours', doraMetrics.lead_time_for_changes),
        glowColor: 'emerald',
      },
      {
        label: 'Change Failure Rate',
        value: fmtPercent(doraMetrics.change_failure_rate),
        unit: '',
        band: classifyDora('change_failure_rate', doraMetrics.change_failure_rate),
        glowColor: 'amber',
      },
      {
        label: 'Mean Time to Restore',
        value: fmtDuration(doraMetrics.mean_time_to_restore),
        unit: '',
        band: classifyDora('mttr_hours', doraMetrics.mean_time_to_restore),
        glowColor: 'rose',
      },
    ];
  }, [doraMetrics]);

  const criticalPRs = useMemo(() =>
    (prRisk || []).filter(p => (p.risk_score || 0) >= 0.6).slice(0, 4),
    [prRisk]
  );

  const criticalBurnout = useMemo(() =>
    (burnout || []).filter(b => (b.burnout_score || 0) >= 0.5).slice(0, 4),
    [burnout]
  );

  const chartData = useMemo(() =>
    (doraHistory || []).slice(-14).map(d => ({
      date: fmtDate(d.date),
      'Deploy Freq': +fmt(d.deployment_frequency),
      'CFR %': +fmt(d.cfr),
    })),
    [doraHistory]
  );

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* DORA Summary */}
      <section>
        <SectionHeader
          icon={Activity}
          title="DORA Performance"
          subtitle={`Last ${doraMetrics?.period_days || 30} days`}
        />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {loading
            ? [1,2,3,4].map(i => <SkeletonCard key={i} />)
            : doraCards.map((c, i) => (
              <MetricCard key={i} {...c} loading={false} />
            ))
          }
        </div>
      </section>

      {/* Trend Chart */}
      <section>
        <SectionHeader
          icon={TrendingUp}
          title="14-Day Deployment Trend"
          subtitle="Deployment frequency & change failure rate"
        />
        <div className="card card-glow-cyan p-5">
          {loading ? (
            <div className="skeleton h-48 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Deploy Freq" stroke="#22d3ee" fill="url(#gradCyan)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="CFR %" stroke="#fbbf24" fill="url(#gradAmber)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High-risk PRs */}
        <section>
          <SectionHeader
            icon={GitPullRequest}
            title="High-Risk Pull Requests"
            subtitle="XGBoost risk score ≥ 0.6"
          />
          <div className="card card-glow-amber p-4 space-y-2">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)
            ) : criticalPRs.length === 0 ? (
              <p className="text-sm text-slate-500 font-mono text-center py-6">No high-risk PRs — great work!</p>
            ) : criticalPRs.map(pr => {
              const rl = pr.risk_label || riskLabel(pr.risk_score);
              const rc = riskTextColor(rl);
              return (
                <div key={pr.pr_number} className="flex items-center gap-3 p-3 rounded-lg bg-base-700/50 hover:bg-base-700 transition-colors">
                  <span className="font-mono text-xs text-slate-500 w-10 flex-shrink-0">#{pr.pr_number}</span>
                  <span className="text-sm text-slate-200 flex-1 truncate">{pr.title}</span>
                  <span className="badge flex-shrink-0" style={{ background: riskBg(rl), color: rc, border: `1px solid ${rc}30` }}>
                    {fmt(pr.risk_score * 100, 0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Burnout alerts */}
        <section>
          <SectionHeader
            icon={Users}
            title="Contributor Burnout Alerts"
            subtitle="Isolation Forest anomaly detected"
          />
          <div className="card card-glow-rose p-4 space-y-2">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)
            ) : criticalBurnout.length === 0 ? (
              <p className="text-sm text-slate-500 font-mono text-center py-6">All contributors look healthy!</p>
            ) : criticalBurnout.map(c => {
              const color = burnoutColor(c.burnout_score);
              const label = burnoutLabel(c.burnout_score);
              const ac = avatarColor(c.contributor);
              return (
                <div key={c.contributor} className="flex items-center gap-3 p-3 rounded-lg bg-base-700/50 hover:bg-base-700 transition-colors">
                  <Avatar name={c.contributor} color={ac} size={8} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 font-medium truncate">{c.contributor}</div>
                    <div className="text-xs text-slate-500 font-mono">{c.commits_30d} commits · {c.weekend_commits} weekends</div>
                  </div>
                  <span className="badge flex-shrink-0" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
