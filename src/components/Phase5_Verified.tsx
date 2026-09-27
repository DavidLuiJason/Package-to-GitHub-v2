import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  FolderGit2,
  GitCommit,
  FileCode,
  FileText,
  Download,
  Eye,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { ProjectManifest } from '../types/archive';
import { RepoVerificationResult } from '../types/github';

interface Phase5VerifiedProps {
  manifest: ProjectManifest;
  verification: RepoVerificationResult;
  onPublishAnother: () => void;
  onViewManifest: () => void;
}

export const Phase5_Verified: React.FC<Phase5VerifiedProps> = ({
  manifest,
  verification,
  onPublishAnother,
  onViewManifest,
}) => {
  const [copiedClone, setCopiedClone] = useState(false);
  const repo = manifest.publication?.repository;
  const git = manifest.publication?.git;

  const cloneCommand = `git clone ${repo?.url || ''}.git`;

  const handleCopyClone = () => {
    navigator.clipboard.writeText(cloneCommand);
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  const handleDownloadManifest = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pack2git-manifest-${repo?.name || 'repo'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>Verification Cockpit</span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              · 100% Tree Match
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Published files and Git directory tree have been independently verified on GitHub.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onPublishAnother}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Publish Another</span>
          </button>

          {repo && (
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <span>Open on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Verification Card */}
      <div className="bg-[#0c101d] border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="font-semibold text-slate-200 text-sm">
                Independent Repository Verification
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Verified via GitHub Git Database Recursive Tree API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Integrity Verified</span>
          </div>
        </div>

        {/* Verification Checkpoint Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[11px] block mb-1">
              Repository Created
            </span>
            <span className="text-slate-100 font-bold text-xs flex items-center gap-1.5 font-mono truncate" title={repo?.fullName}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {repo?.fullName}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[11px] block mb-1">
              Files Tree Match
            </span>
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 font-mono tabular-nums">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {verification.expectedFilesCount} expected / {verification.actualFilesCount} found
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[11px] block mb-1">
              Commit Confirmed
            </span>
            <span className="text-slate-200 font-bold text-xs flex items-center gap-1.5 font-mono truncate" title={git?.commitSha}>
              <GitCommit className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {git?.commitSha.slice(0, 7)} ({repo?.defaultBranch || 'main'})
            </span>
          </div>
        </div>

        {/* Git Clone Command Box */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
          <div className="truncate font-mono text-xs text-slate-300">
            <span className="text-indigo-400 select-none">$ </span>
            {cloneCommand}
          </div>
          <button
            type="button"
            onClick={handleCopyClone}
            className="p-1.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-300 transition-colors shrink-0 cursor-pointer"
            title="Copy git clone command"
          >
            {copiedClone ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Internal Manifest Card */}
      <div className="bg-[#0c101d] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <h2 className="font-semibold text-slate-200 text-sm">
                Internal Publishing Manifest
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Session verification report retained internally
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onViewManifest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View JSON</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadManifest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">
              Source ZIP
            </span>
            <span className="text-slate-200 font-semibold truncate block" title={manifest.sourceArchive.fileName}>
              {manifest.sourceArchive.fileName}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">
              Project Type
            </span>
            <span className="text-slate-200 font-semibold block">
              {manifest.projectType}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">
              Root Stripping
            </span>
            <span className="text-slate-200 font-semibold block">
              {manifest.projectRoot.stripped ? 'Stripped' : 'Retained'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-sans">
              Branch & Commit
            </span>
            <span className="text-slate-200 font-semibold block">
              {repo?.defaultBranch || 'main'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
