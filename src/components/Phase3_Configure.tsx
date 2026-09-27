import React, { useState, useEffect } from 'react';
import {
  Github,
  Key,
  ShieldCheck,
  Lock,
  Globe,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  RefreshCw,
  FolderGit2,
  Check,
  X,
} from 'lucide-react';
import { GitHubUser, PublishConfig } from '../types/github';
import { GitHubClient } from '../services/github/githubClient';
import { ArchivePackage } from '../services/archive/archiveReader';

interface Phase3ConfigureProps {
  pkg: ArchivePackage;
  client: GitHubClient | null;
  user: GitHubUser | null;
  onConnectToken: (token: string) => Promise<void>;
  onDisconnect: () => void;
  onBack: () => void;
  onStartPublish: (config: PublishConfig) => void;
}

export const Phase3_Configure: React.FC<Phase3ConfigureProps> = ({
  pkg,
  client,
  user,
  onConnectToken,
  onDisconnect,
  onBack,
  onStartPublish,
}) => {
  // Auth state
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  // Repo config state
  const initialName = pkg.fileName
    .replace(/\.zip$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '-')
    .replace(/^-+|-+$/g, '') || 'new-repo';

  const [repoName, setRepoName] = useState(initialName);
  const [description, setDescription] = useState(
    `Project exported from ${pkg.fileName} using Pack2Git`
  );
  const [isPrivate, setIsPrivate] = useState(true);

  // Proactive Repo Availability state
  const [isCheckingRepo, setIsCheckingRepo] = useState(false);
  const [repoExists, setRepoExists] = useState<boolean | null>(null);
  const [repoCheckError, setRepoCheckError] = useState<string | null>(null);

  // Validate token connection
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsValidatingToken(true);
    setAuthError(null);

    try {
      await onConnectToken(tokenInput.trim());
      setTokenInput(''); // Clear plain text input once validated and stored in session memory
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate with GitHub. Please check your token and scopes.');
    } finally {
      setIsValidatingToken(false);
    }
  };

  // Check repo existence when user or repoName changes (Proactive Availability Engine)
  useEffect(() => {
    if (!client || !user || !repoName.trim()) {
      setRepoExists(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingRepo(true);
      setRepoCheckError(null);
      try {
        const exists = await client.repoExists(user.login, repoName.trim());
        setRepoExists(exists);
      } catch (err: any) {
        if (err.status !== 404) {
          setRepoCheckError(err.message);
        }
      } finally {
        setIsCheckingRepo(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [client, user, repoName]);

  const handleNameChange = (val: string) => {
    // Sanitize repo name according to GitHub rules (alphanumerics, -, _, .)
    const clean = val.replace(/[^a-zA-Z0-9_.-]/g, '-');
    setRepoName(clean);
  };

  const canPublish =
    Boolean(user && client) &&
    repoName.trim().length > 0 &&
    repoExists === false &&
    !isCheckingRepo;

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            GitHub Authentication & Target Repository
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect your developer account and configure the destination repository.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Structure</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: GITHUB AUTHENTICATION */}
        <div className="lg:col-span-5 bg-[#0c101d] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-indigo-400" />
              <h2 className="font-semibold text-slate-200 text-sm">
                GitHub Session
              </h2>
            </div>
            <span
              className={`text-xs font-mono font-medium ${
                user ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {user ? 'Connected' : 'Token Required'}
            </span>
          </div>

          {user ? (
            /* Authenticated Account Profile Card */
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-10 h-10 rounded-full ring-1 ring-emerald-500/50"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-100 text-sm truncate">
                      {user.name || user.login}
                    </span>
                    <a
                      href={user.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-400 hover:text-slate-200"
                      title="View GitHub profile"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <span className="text-xs text-indigo-400 font-mono block">
                    @{user.login}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-800/80 tabular-nums">
                <div className="bg-[#080c16] p-2 rounded border border-slate-800/60">
                  <span className="text-slate-400 text-[10px] uppercase font-sans block">
                    Public Repos
                  </span>
                  <span className="text-slate-200 font-semibold">{user.public_repos}</span>
                </div>
                <div className="bg-[#080c16] p-2 rounded border border-slate-800/60">
                  <span className="text-slate-400 text-[10px] uppercase font-sans block">
                    Private Repos
                  </span>
                  <span className="text-slate-200 font-semibold">
                    {user.total_private_repos ?? 'Active'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onDisconnect}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 text-xs border border-slate-700/60 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect GitHub Session</span>
              </button>
            </div>
          ) : (
            /* Connection Form */
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    Personal Access Token
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTokenHelp(!showTokenHelp)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Guide</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_... or github_pat_..."
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full pl-3 pr-10 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Helper Drawer */}
              {showTokenHelp && (
                <div className="p-3 rounded-lg bg-[#080c16] border border-indigo-500/30 text-xs space-y-2">
                  <div className="font-semibold text-indigo-300 text-[11px]">
                    Token Scopes Required:
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Create a token with <code className="px-1 py-0.5 bg-slate-800 rounded text-indigo-300 font-mono">repo</code> permissions to allow repository creation and file publishing.
                  </p>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Pack2Git"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline pt-1 font-mono"
                  >
                    <span>Open GitHub Token Generator</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Zero Storage Notice */}
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>In-memory only:</strong> Token is never written to localStorage or cookies. Cleared upon closing tab.
                </span>
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!tokenInput.trim() || isValidatingToken}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-all disabled:opacity-50 cursor-pointer"
              >
                {isValidatingToken ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying with GitHub...</span>
                  </>
                ) : (
                  <>
                    <Github className="w-3.5 h-3.5" />
                    <span>Authenticate Session</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* RIGHT COLUMN: REPOSITORY CONFIGURATION & LIVE AVAILABILITY CHECK */}
        <div className={`lg:col-span-7 bg-[#0c101d] border border-slate-800 rounded-xl p-5 space-y-5 ${!user ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              <h2 className="font-semibold text-slate-200 text-sm">
                Target Repository Parameters
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              New Repository Only
            </span>
          </div>

          {/* Repository Name with PROACTIVE AVAILABILITY ENGINE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 block">
                Repository Name <span className="text-rose-400">*</span>
              </label>

              {/* Status pill header */}
              {repoName.trim() && (
                <div className="text-[11px] font-mono">
                  {isCheckingRepo ? (
                    <span className="text-slate-400 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" /> Checking GitHub...
                    </span>
                  ) : repoExists === true ? (
                    <span className="text-rose-400 flex items-center gap-1 font-semibold">
                      <X className="w-3.5 h-3.5" /> Unavailable
                    </span>
                  ) : repoExists === false ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Available
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex items-center">
              <span className="px-3 py-2 rounded-l-lg bg-slate-900 border border-r-0 border-slate-700 text-xs font-mono text-slate-400 select-none shrink-0">
                {user?.login || 'owner'} /
              </span>
              <input
                type="text"
                value={repoName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="repository-name"
                className={`w-full px-3 py-2 rounded-r-lg bg-slate-950 border text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition-colors ${
                  repoExists === true
                    ? 'border-rose-500/80 focus:border-rose-500'
                    : repoExists === false
                    ? 'border-emerald-500/80 focus:border-emerald-500'
                    : 'border-slate-700 focus:border-indigo-500'
                }`}
              />
            </div>

            {/* Proactive Availability Detailed Feedback Box */}
            <div className="text-xs transition-all duration-200">
              {isCheckingRepo && (
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 flex items-center gap-2 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Proactively verifying name availability on GitHub API...</span>
                </div>
              )}

              {!isCheckingRepo && repoExists === true && (
                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800 text-rose-300 flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Repository name unavailable</span>
                    <span>A repository named "{user?.login}/{repoName}" already exists in your account. Pack2Git creates new repositories and cannot overwrite existing ones.</span>
                  </div>
                </div>
              )}

              {!isCheckingRepo && repoExists === false && repoName.trim() && (
                <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/60 text-emerald-300 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Available:</strong> Repository "{user?.login}/{repoName}" is clear and ready to be created.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Description <span className="text-slate-400 font-normal font-mono">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project description"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  isPrivate
                    ? 'bg-indigo-600/10 border-indigo-500/80 text-slate-200 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Private</div>
                  <div className="text-[11px] text-slate-400">Restricted to your account</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  !isPrivate
                    ? 'bg-indigo-600/10 border-indigo-500/80 text-slate-200 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Globe className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Public</div>
                  <div className="text-[11px] text-slate-400">Accessible to all users</div>
                </div>
              </button>
            </div>
          </div>

          {/* Final Action Launch Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={!canPublish}
              onClick={() =>
                onStartPublish({
                  repoName: repoName.trim(),
                  description: description.trim(),
                  isPrivate,
                  autoInit: true,
                })
              }
              className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold text-xs sm:text-sm shadow-md transition-all ${
                canPublish
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <span>Initialize Repository & Publish Files</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
