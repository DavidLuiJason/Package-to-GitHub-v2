import React, { useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Trash2,
  ArrowLeft,
  ExternalLink,
  FolderGit2,
  ShieldAlert,
} from 'lucide-react';
import { PublishProgress } from '../types/github';
import { GitHubClient } from '../services/github/githubClient';

interface FailureViewProps {
  progress: PublishProgress;
  client: GitHubClient | null;
  onRetry: () => void;
  onBackToConfig: () => void;
  onReset: () => void;
}

export const FailureView: React.FC<FailureViewProps> = ({
  progress,
  client,
  onRetry,
  onBackToConfig,
  onReset,
}) => {
  const [isDeletingRepo, setIsDeletingRepo] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const hasPartialRepo = Boolean(progress.createdRepo);

  const handleDeletePartialRepo = async () => {
    if (!client || !progress.createdRepo) return;

    if (
      !window.confirm(
        `Are you sure you want to delete the incomplete repository "${progress.createdRepo.full_name}" from GitHub?`
      )
    ) {
      return;
    }

    setIsDeletingRepo(true);
    setDeleteMessage(null);

    try {
      await client.deleteRepository(
        progress.createdRepo.owner.login,
        progress.createdRepo.name
      );
      setDeleteMessage(`Repository "${progress.createdRepo.full_name}" was successfully deleted.`);
    } catch (err: any) {
      setDeleteMessage(`Failed to delete repository: ${err.message}. You can delete it manually on GitHub.`);
    } finally {
      setIsDeletingRepo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>Pipeline Interrupted</span>
            <span className="text-xs font-mono text-rose-400 font-semibold">
              · Error Detected
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            The operation stopped before full verification. Review the state breakdown and recovery options below.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>Start Over</span>
        </button>
      </div>

      {/* Main Error Diagnosis Card */}
      <div className="bg-[#0c101d] border border-rose-800/60 rounded-xl p-6 space-y-5 shadow-xl">
        {/* Error message */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider font-mono">
            1. Root Failure Cause
          </span>
          <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/80 text-rose-200 text-xs font-mono leading-relaxed break-words">
            {progress.errorMessage || 'An unknown error occurred during publication.'}
          </div>
        </div>

        {/* State Report */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            2. Verified Partial State
          </span>
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span>GitHub Authentication:</span>
              <span className="text-emerald-400 font-semibold">Verified</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Repository Creation:</span>
              <span className={hasPartialRepo ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                {hasPartialRepo ? 'Created' : 'Not created'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Uploaded Blobs:</span>
              <span className="text-slate-200 tabular-nums">
                {progress.uploadedFilesCount} of {progress.totalFilesCount} files
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Git Commit & Verification:</span>
              <span className="text-rose-400 font-semibold">Incomplete</span>
            </div>
          </div>
        </div>

        {/* Partial State Notice */}
        {hasPartialRepo && (
          <div className="space-y-2 p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Partial State Notice</span>
            </div>
            <p className="leading-relaxed">
              The repository <strong>{progress.createdRepo?.full_name}</strong> was created on GitHub before the error occurred. You can retry publishing or remove the incomplete repository.
            </p>
            {progress.createdRepo?.html_url && (
              <a
                href={progress.createdRepo.html_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-indigo-400 hover:underline pt-1 font-mono"
              >
                <span>View incomplete repository on GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {deleteMessage && (
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
            {deleteMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Publishing Pipeline</span>
          </button>

          {hasPartialRepo && !deleteMessage && (
            <button
              type="button"
              disabled={isDeletingRepo}
              onClick={handleDeletePartialRepo}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 hover:text-rose-300 text-slate-300 font-medium text-xs border border-slate-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingRepo ? 'Deleting...' : 'Delete Incomplete Repo'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToConfig}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Adjust Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
