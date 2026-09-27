import React from 'react';
import {
  UploadCloud,
  CheckCircle2,
  FileCode,
  FolderGit2,
  RefreshCw,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { PublishProgress } from '../types/github';

interface Phase4PublishingProps {
  progress: PublishProgress;
  onCancel: () => void;
}

export const Phase4_Publishing: React.FC<Phase4PublishingProps> = ({
  progress,
  onCancel,
}) => {
  const steps = [
    {
      id: 'auth_and_check',
      label: 'Authentication & Availability Check',
      isDone: progress.currentStep > 2,
      isActive: progress.phase === 'authenticating' || progress.phase === 'checking_repo',
    },
    {
      id: 'create_repo',
      label: 'Repository Creation & Git DB Provisioning',
      isDone: progress.currentStep > 3,
      isActive: progress.phase === 'creating_repo',
    },
    {
      id: 'upload_blobs',
      label: `Upload Blobs (${progress.uploadedFilesCount} / ${progress.totalFilesCount})`,
      isDone: progress.currentStep > 4,
      isActive: progress.phase === 'uploading_blobs',
    },
    {
      id: 'create_commit',
      label: 'Generate Git Tree, Commit & Branch Reference',
      isDone: progress.currentStep > 5,
      isActive: progress.phase === 'building_tree' || progress.phase === 'creating_commit' || progress.phase === 'updating_ref',
    },
    {
      id: 'verification',
      label: 'Independent Tree Structure Verification',
      isDone: progress.phase === 'completed',
      isActive: progress.phase === 'verifying',
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>Publishing Pipeline</span>
            <span className="text-xs font-mono text-indigo-400 font-normal">
              · Live Execution
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Streaming Git objects, staging directory tree, and committing to target branch.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Abort Pipeline</span>
        </button>
      </div>

      {/* Main Execution Card */}
      <div className="bg-[#0c101d] border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-2 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              {progress.phaseLabel}
            </span>
            <span className="text-indigo-400 font-mono text-sm tabular-nums">
              {progress.percent}%
            </span>
          </div>

          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${Math.min(100, Math.max(2, progress.percent))}%` }}
            />
          </div>
        </div>

        {/* Current Active Blob Ticker */}
        {progress.currentFile && (
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center gap-2.5">
            <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="truncate font-mono text-slate-300">
              <span className="text-slate-400">Uploading Blob: </span>
              {progress.currentFile}
            </div>
          </div>
        )}

        {/* Pipeline Stage Indicators */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Pipeline Execution Steps
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            {steps.map((st) => (
              <div
                key={st.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between transition-colors ${
                  st.isDone
                    ? 'bg-emerald-950/15 border-emerald-800/30 text-emerald-300'
                    : st.isActive
                    ? 'bg-indigo-950/25 border-indigo-500/40 text-indigo-200'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {st.isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : st.isActive ? (
                    <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span className="truncate">{st.label}</span>
                </div>

                <span className="text-[10px] uppercase font-sans font-semibold shrink-0">
                  {st.isDone ? 'Completed' : st.isActive ? 'Active' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Partial State Repository Reference */}
        {progress.createdRepo && (
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate pr-2">
              <FolderGit2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">
                Repository: <strong className="text-slate-100 font-mono">{progress.createdRepo.full_name}</strong>
              </span>
            </div>
            <a
              href={progress.createdRepo.html_url}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px] font-mono shrink-0"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
