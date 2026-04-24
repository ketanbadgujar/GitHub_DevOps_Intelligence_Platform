import React from 'react';
import { RefreshCw, ChevronDown, Clock } from 'lucide-react';
import { MockBadge } from './UI';
import { timeAgo } from '../utils/format';

export default function Header({ repos, selectedRepo, onRepoChange, lastUpdated, onRefresh, refreshing, isMock }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3
      border-b border-base-700 bg-base-900/90 backdrop-blur-md">
      {/* Repo selector */}
      <div className="flex items-center gap-3">
        <div className="label">Repository</div>
        <div className="relative">
          <select
            value={selectedRepo}
            onChange={e => onRepoChange(e.target.value)}
            className="appearance-none bg-base-800 border border-base-600 rounded-lg
              pl-3 pr-8 py-1.5 text-sm font-mono text-slate-200
              hover:border-cyan-400/40 focus:outline-none focus:border-cyan-400/60
              transition-colors cursor-pointer"
          >
            {repos?.map(r => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
            {(!repos || repos.length === 0) && (
              <option value="">No repos tracked</option>
            )}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
        {isMock && <MockBadge />}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Clock size={11} />
            {timeAgo(lastUpdated)}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
            bg-base-800 border border-base-600 text-slate-300
            hover:border-cyan-400/40 hover:text-cyan-400 transition-all disabled:opacity-40"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </header>
  );
}
