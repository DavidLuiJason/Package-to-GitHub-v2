import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Search,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  FolderTree,
  Layers,
  XCircle,
  FileText,
} from 'lucide-react';
import { ArchivePackage } from '../services/archive/archiveReader';

interface Phase2PreviewProps {
  pkg: ArchivePackage;
  onUpdateRootStripping: (strip: boolean) => void;
  onBack: () => void;
  onProceed: () => void;
}

export const Phase2_Preview: React.FC<Phase2PreviewProps> = ({
  pkg,
  onUpdateRootStripping,
  onBack,
  onProceed,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllFiles, setShowAllFiles] = useState(false);

  const { inspection } = pkg;
  const { rootInfo, validation, useRootStripping } = inspection;
  const { stats, checks, issues, canPublish } = validation;

  const filteredFiles = inspection.filesOnly.filter((entry) => {
    const q = searchQuery.toLowerCase();
    return (
      entry.repoPath.toLowerCase().includes(q) ||
      entry.path.toLowerCase().includes(q)
    );
  });

  const displayedFiles = showAllFiles
    ? filteredFiles
    : filteredFiles.slice(0, 50);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* View Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <span>Project Inspection & Validation</span>
            <span className="text-xs font-mono text-indigo-400 font-semibold">
              · {validation.detectedProjectType}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit detected root, safety constraints, and review destination repository tree before publishing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Archive</span>
          </button>

          <button
            type="button"
            disabled={!canPublish}
            onClick={onProceed}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all shadow-md ${
              canPublish
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <span>Configure Repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ROOT DETECTION SECTION */}
      <div className="bg-[#0c101d] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="font-semibold text-slate-200 text-sm">
              Repository Root Detection
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {rootInfo.hasWrapperFolder ? 'Wrapper Enclosed' : 'Flat Project Root'}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {rootInfo.reason}
        </p>

        {rootInfo.hasWrapperFolder && (
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Strip outer wrapper folder "{rootInfo.detectedRoot}"
                </span>
                <span className="text-[11px] text-slate-400">
                  Recommended: Places project files directly at repository root rather than inside a subfolder.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onUpdateRootStripping(!useRootStripping)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  useRootStripping ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useRootStripping ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Path mapping preview */}
            <div className="pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 text-[11px] font-medium block mb-1">
                Live path mapping preview:
              </span>
              <div className="bg-[#080c16] rounded-lg p-2.5 font-mono text-[11px] space-y-1 border border-slate-800/60">
                <div className="text-slate-400">
                  ZIP Archive entry:{' '}
                  <span className="text-slate-300">
                    {rootInfo.detectedRoot}src/main.ts
                  </span>
                </div>
                <div className="text-indigo-400 font-medium">
                  GitHub Repository path:{' '}
                  <span className="text-indigo-300">
                    {useRootStripping ? 'src/main.ts' : `${rootInfo.detectedRoot}src/main.ts`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VALIDATION & SAFETY CHECKLIST */}
      <div className="bg-[#0c101d] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="font-semibold text-slate-200 text-sm">
              Safety & Integrity Pre-Flight Checks
            </h2>
          </div>
          <span
            className={`text-xs font-mono font-medium ${
              validation.isValid ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {validation.isValid ? 'All Checks Passed' : 'Action Required'}
          </span>
        </div>

        {/* Checks grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {checks.map((check) => (
            <div
              key={check.name}
              className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                check.passed
                  ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                  : 'bg-rose-950/20 border-rose-800/60 text-rose-200'
              }`}
            >
              {check.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-semibold text-slate-200 block">
                  {check.name}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {check.description}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Issues list (if any) */}
        {issues.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-400">
              Notices & Warnings ({issues.length})
            </div>
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg text-xs border flex items-start gap-2.5 ${
                  issue.type === 'error'
                    ? 'bg-rose-950/30 border-rose-800 text-rose-200'
                    : issue.type === 'warning'
                    ? 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                    : 'bg-slate-900/50 border-slate-800 text-slate-300'
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    issue.type === 'error'
                      ? 'text-rose-400'
                      : issue.type === 'warning'
                      ? 'text-amber-400'
                      : 'text-sky-400'
                  }`}
                />
                <div>
                  <span className="font-semibold block">{issue.message}</span>
                  {issue.details && (
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      {issue.details}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REPOSITORY CONTENTS EXPLORER */}
      <div className="bg-[#0c101d] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-sky-400" />
            <div>
              <h2 className="font-semibold text-slate-200 text-sm">
                Target Repository File Tree
              </h2>
              <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                {stats.totalFiles} files · {stats.totalFolders} folders · {formatBytes(stats.totalUncompressedBytes)} uncompressed
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter file tree..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* High-density file list */}
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
          <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 flex justify-between font-mono">
            <span>Repository Relative Path</span>
            <span>Size</span>
          </div>

          <div className="divide-y divide-slate-850 max-h-80 overflow-y-auto font-mono text-xs">
            {displayedFiles.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No matching files found.
              </div>
            ) : (
              displayedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="px-4 py-1.5 flex items-center justify-between hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-300 truncate" title={file.repoPath}>
                      {file.repoPath}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px] shrink-0 tabular-nums">
                    {formatBytes(file.size)}
                  </span>
                </div>
              ))
            )}
          </div>

          {filteredFiles.length > 50 && !showAllFiles && (
            <div className="p-2 text-center bg-slate-900/80 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAllFiles(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1 px-3 rounded cursor-pointer"
              >
                Show all {filteredFiles.length} files...
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
