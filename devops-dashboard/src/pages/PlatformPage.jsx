import React from 'react';
import { Database, Server, Cpu, Bell, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { SectionHeader, StatusDot, Badge, Skeleton } from '../components/UI';
import { fmtDateTime, timeAgo } from '../utils/format';

const SERVICE_META = {
  gateway:   { icon: Server,   label: 'API Gateway',        port: 8000, desc: 'FastAPI gateway + Swagger UI' },
  dora:      { icon: Database, label: 'DORA Metrics API',   port: 8002, desc: 'FastAPI DORA computation service' },
  ml:        { icon: Cpu,      label: 'ML Service',         port: 8003, desc: 'XGBoost PR risk + Isolation Forest burnout' },
  collector: { icon: Database, label: 'GitHub Collector',   port: null, desc: 'GitHub API data ingestion worker' },
  database:  { icon: Database, label: 'PostgreSQL',         port: 5432, desc: 'Primary data store' },
};

function ServiceCard({ name, status }) {
  const meta = SERVICE_META[name] || { icon: Server, label: name, port: null, desc: '' };
  const Icon = meta.icon;
  const isUp = status?.toLowerCase() === 'up' || status?.toLowerCase() === 'healthy';
  const color = isUp ? '#34d399' : '#fb7185';

  return (
    <div
      className="card p-4 transition-all"
      style={{ borderColor: `${color}20`, background: `${color}05` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-lg" style={{ background: `${color}15` }}>
            <Icon size={14} style={{ color }} />
          </span>
          <div>
            <div className="font-mono text-sm font-medium text-slate-200">{meta.label}</div>
            {meta.port && (
              <div className="text-xs text-slate-500 font-mono">:{meta.port}</div>
            )}
          </div>
        </div>
        <StatusDot status={status} />
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{meta.desc}</p>
      {meta.port && (
        <a
          href={`http://localhost:${meta.port}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-3 text-xs font-mono text-slate-500 hover:text-cyan-400 transition-colors"
        >
          Swagger UI <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

const MOCK_ALERTS = [
  { id: 1, type: 'burnout',    message: 'dave: CRITICAL burnout detected — 241 commits, 41 weekend commits in 30d', ts: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, type: 'pr_risk',   message: 'PR #246 (database schema migration v3) classified CRITICAL — 91% risk score', ts: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, type: 'burnout',   message: 'alice: HIGH burnout detected — 187 commits, 24h reviews in 30d', ts: new Date(Date.now() - 14400000).toISOString() },
  { id: 4, type: 'dora',      message: 'Change failure rate elevated to 8.3% (above Elite threshold of 5%)', ts: new Date(Date.now() - 86400000).toISOString() },
  { id: 5, type: 'pr_risk',   message: 'PR #247 (refactor authentication middleware) scored HIGH — 87% risk', ts: new Date(Date.now() - 172800000).toISOString() },
];

const ALERT_COLORS = {
  burnout:  '#fb7185',
  pr_risk:  '#fbbf24',
  dora:     '#22d3ee',
};

export default function PlatformPage({ health, loading }) {
  const services = health?.services || {};
  const overallStatus = health?.status || 'unknown';

  const dockerServices = [
    { name: 'api-gateway', port: 8000, image: 'devops-gateway:latest' },
    { name: 'dora-service', port: 8002, image: 'devops-dora:latest' },
    { name: 'ml-service', port: 8003, image: 'devops-ml:latest' },
    { name: 'postgres', port: 5432, image: 'postgres:15-alpine' },
    { name: 'dashboard', port: 3000, image: 'devops-dashboard:latest' },
  ];

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <SectionHeader
        icon={Database}
        title="Platform Health"
        subtitle="Service status, Docker stack, and Slack alert history"
        actions={
          <div className="flex items-center gap-2">
            <StatusDot status={overallStatus} />
            <span className="text-xs font-mono text-slate-400">Overall</span>
          </div>
        }
      />

      {/* Services grid */}
      <section>
        <div className="label mb-4">Microservices</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [1,2,3,4,5].map(i => (
              <div key={i} className="card p-4 space-y-3">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))
          ) : Object.entries(services).map(([name, status]) => (
            <ServiceCard key={name} name={name} status={status} />
          ))}
        </div>
      </section>

      {/* Docker Compose stack */}
      <section>
        <div className="label mb-4">Docker Compose Stack</div>
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-base-700 bg-base-700/30 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-xs text-slate-500 ml-2">docker compose ps</span>
          </div>
          <div className="p-4 font-mono text-xs space-y-2 grid-scanline">
            <div className="flex gap-4 text-slate-500 border-b border-base-700/50 pb-2 mb-3">
              <span className="w-36">NAME</span>
              <span className="w-20">STATUS</span>
              <span className="w-20">PORTS</span>
              <span>IMAGE</span>
            </div>
            {dockerServices.map(svc => (
              <div key={svc.name} className="flex gap-4 items-center hover:bg-base-700/30 px-1 py-0.5 rounded">
                <span className="w-36 text-slate-200">{svc.name}</span>
                <span className="w-20">
                  <span className="badge text-emerald-400 bg-emerald-400/10 border border-emerald-400/20">running</span>
                </span>
                <span className="w-20 text-cyan-400">{svc.port && `0.0.0.0:${svc.port}`}</span>
                <span className="text-slate-500">{svc.image}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture diagram */}
      <section>
        <div className="label mb-4">Architecture Overview</div>
        <div className="card p-6 grid-scanline">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { label: 'GitHub API', color: '#64748b', sub: 'Source' },
              { label: '→', color: '#374151', plain: true },
              { label: 'Collector', color: '#22d3ee', sub: ':8001' },
              { label: '→', color: '#374151', plain: true },
              { label: 'PostgreSQL', color: '#34d399', sub: ':5432' },
            ].map((node, i) => node.plain ? (
              <span key={i} className="text-slate-600 text-xl">→</span>
            ) : (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="px-4 py-2.5 rounded-xl font-mono text-xs font-semibold border"
                  style={{ color: node.color, borderColor: `${node.color}40`, background: `${node.color}12` }}>
                  {node.label}
                </div>
                <span className="text-[10px] text-slate-600 font-mono">{node.sub}</span>
              </div>
            ))}
          </div>
          <div className="my-4 border-t border-base-700/50 pt-4 flex items-center justify-center gap-3 flex-wrap">
            {[
              { label: 'DORA API', color: '#22d3ee', sub: ':8002' },
              { label: '←→', plain: true },
              { label: 'API Gateway', color: '#a78bfa', sub: ':8000' },
              { label: '←→', plain: true },
              { label: 'ML Service', color: '#fbbf24', sub: ':8003' },
              { label: '←→', plain: true },
              { label: 'Dashboard', color: '#34d399', sub: ':3000' },
            ].map((node, i) => node.plain ? (
              <span key={i} className="text-slate-600">↔</span>
            ) : (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="px-4 py-2.5 rounded-xl font-mono text-xs font-semibold border"
                  style={{ color: node.color, borderColor: `${node.color}40`, background: `${node.color}12` }}>
                  {node.label}
                </div>
                <span className="text-[10px] text-slate-600 font-mono">{node.sub}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <span className="text-slate-600 text-sm">↓</span>
          </div>
          <div className="flex justify-center mt-2">
            <div className="flex flex-col items-center gap-1">
              <div className="px-4 py-2.5 rounded-xl font-mono text-xs font-semibold border"
                style={{ color: '#fb7185', borderColor: '#fb718540', background: '#fb718512' }}>
                Slack Alerts
              </div>
              <span className="text-[10px] text-slate-600 font-mono">webhook</span>
            </div>
          </div>
        </div>
      </section>

      {/* Alert history */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bell size={14} className="text-slate-500" />
          <div className="label">Recent Slack Alerts</div>
        </div>
        <div className="card divide-y divide-base-700/50">
          {MOCK_ALERTS.map(alert => {
            const color = ALERT_COLORS[alert.type] || '#64748b';
            return (
              <div key={alert.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-base-700/20 transition-colors">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 leading-relaxed">{alert.message}</p>
                  <span className="font-mono text-xs text-slate-500">{timeAgo(alert.ts)}</span>
                </div>
                <span className="badge flex-shrink-0 capitalize text-[10px]"
                  style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>
                  {alert.type.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
