import React from 'react';
import { Package, Menu, LogOut, Github, RotateCcw } from 'lucide-react';
import { GitHubUser } from '../types/github';

interface HeaderProps {
  user: GitHubUser | null;
  onDisconnect: () => void;
  onReset: () => void;
  rateLimitRemaining?: number;
  activeFileName?: string;
  activeRepoName?: string;
  onToggleMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onDisconnect,
  onReset,
  rateLimitRemaining,
  activeFileName,
  activeRepoName,
  onToggleMobileNav,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-800/80 bg-[#0a0e1a]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      {/* Zone 1 & 2: Brand + Workspace Breadcrumbs */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 lg:hidden cursor-pointer"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Wordmark (Single Text Element) */}
        <div
          onClick={onReset}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Package className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-100 text-sm tracking-tight hidden sm:inline">
            Package to GitHub
          </span>
          <span className="font-mono text-xs font-semibold text-indigo-400 sm:hidden">
            Pack2Git
          </span>
        </div>

        {/* Breadcrumb Trail */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 min-w-0">
          <span className="text-slate-400">/</span>
          <span className="text-slate-400 font-mono text-[11px] truncate max-w-[160px]">
            {activeFileName || 'unloaded'}
          </span>
          {activeRepoName && (
            <>
              <span className="text-slate-400">/</span>
              <span className="text-indigo-300 font-mono text-[11px] truncate max-w-[160px]">
                {activeRepoName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Zone 3: Account & Session Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Reset Action */}
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Start fresh with a new package"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Package</span>
        </button>

        {/* GitHub Account Status */}
        {user ? (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg pl-1.5 pr-2 py-1 text-xs">
            <img
              src={user.avatar_url}
              alt={user.login}
              className="w-5 h-5 rounded-full ring-1 ring-emerald-500/50"
            />
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] text-slate-200 font-medium">
                @{user.login}
              </span>
              {rateLimitRemaining !== undefined && (
                <span className="text-[10px] text-slate-400 font-mono tabular-nums hidden sm:inline">
                  · {rateLimitRemaining} reqs
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onDisconnect}
              title="Disconnect GitHub session"
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
              aria-label="Disconnect GitHub"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <Github className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-amber-400/90 text-[11px]">
              Not Connected
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
