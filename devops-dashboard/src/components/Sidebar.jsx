import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, GitPullRequest, Users, Activity,
  Database, Settings, ChevronRight, Zap
} from 'lucide-react';
import { StatusDot } from './UI';

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Overview' },
  { to: '/dora',      icon: Activity,        label: 'DORA Metrics' },
  { to: '/pr-risk',   icon: GitPullRequest,  label: 'PR Risk' },
  { to: '/burnout',   icon: Users,           label: 'Contributor Health' },
  { to: '/platform',  icon: Database,        label: 'Platform Health' },
];

export default function Sidebar({ health }) {
  const loc = useLocation();

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-base-700 bg-base-900 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-base-700">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #22d3ee20, #22d3ee40)', border: '1px solid #22d3ee40' }}>
            <Zap size={14} className="text-cyan-400" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold text-slate-100 leading-none">DevOps</div>
            <div className="font-mono text-[10px] text-slate-500 leading-none mt-0.5">Intelligence Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <div className="label px-3 mb-2 mt-1">Navigation</div>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`nav-link ${active
                ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-base-700 border border-transparent'
              }`}
            >
              <Icon size={15} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} className="opacity-60" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Service health footer */}
      <div className="px-3 py-3 border-t border-base-700 space-y-1.5">
        <div className="label mb-1.5">Services</div>
        {health ? (
          Object.entries(health.services || {}).map(([svc, status]) => (
            <div key={svc} className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-500 capitalize">{svc}</span>
              <StatusDot status={status} />
            </div>
          ))
        ) : (
          ['gateway','dora','ml','db'].map(s => (
            <div key={s} className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-500 capitalize">{s}</span>
              <div className="skeleton h-3 w-10 rounded-full" />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
