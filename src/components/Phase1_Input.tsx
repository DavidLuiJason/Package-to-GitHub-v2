import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileArchive,
  Sparkles,
  AlertTriangle,
  FolderTree,
  FileCode,
  ArrowRight,
  Layers,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  Folder,
} from 'lucide-react';
import { ArchivePackage } from '../services/archive/archiveReader';
import { SAMPLE_PROJECTS, generateSampleArchive } from '../services/archive/sampleProjects';

interface Phase1InputProps {
  onArchiveLoaded: (pkg: ArchivePackage) => void;
  currentPackage: ArchivePackage | null;
  onProceed: () => void;
}

export const Phase1_Input: React.FC<Phase1InputProps> = ({
  onArchiveLoaded,
  currentPackage,
  onProceed,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('Please select a valid .zip archive file.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const pkg = await ArchivePackage.fromFile(file);
      onArchiveLoaded(pkg);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read ZIP archive. The file may be corrupt or encrypted.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleLoadSample = async (sampleId: string) => {
    setLoadingSampleId(sampleId);
    setErrorMessage(null);
    try {
      const pkg = await generateSampleArchive(sampleId);
      onArchiveLoaded(pkg);
    } catch (err: any) {
      setErrorMessage(`Failed to load sample project: ${err.message}`);
    } finally {
      setLoadingSampleId(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Workspace Header Kicker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            Package Ingestion
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a project ZIP archive to inspect, validate, and publish its file tree directly to GitHub.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span>Non-destructive</span>
          <span>·</span>
          <span>Zero telemetry</span>
          <span>·</span>
          <span>In-memory processing</span>
        </div>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 group ${
          isDragging
            ? 'border-indigo-400 bg-indigo-950/20'
            : 'border-slate-800 hover:border-slate-700 bg-[#0c101d] hover:bg-[#0f1424]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 group-hover:scale-105 group-hover:border-indigo-500/40 transition-all">
            {isLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-200">
              {isLoading
                ? 'Inspecting archive structure & CRC32 checksums...'
                : 'Drop project archive here, or browse from device'}
            </p>
            <p className="text-xs text-slate-400 font-mono">
              Accepts .zip packages · Files are mapped directly to repository root
            </p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Archive Extraction Error</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Current Package Overview Card */}
      {currentPackage && (
        <div className="bg-[#0c101d] border border-indigo-500/30 rounded-xl p-5 shadow-lg space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <FileArchive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base font-mono">
                    {currentPackage.fileName}
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="tabular-nums font-mono">
                    {formatBytes(currentPackage.fileSizeBytes)} archive
                  </span>
                  <span>·</span>
                  <span className="text-slate-300 font-medium">
                    {currentPackage.inspection.validation.detectedProjectType}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceed}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>Inspect Package Structure</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <FileCode className="w-3.5 h-3.5" />
                Files
              </div>
              <div className="text-lg font-bold text-slate-100 font-mono tabular-nums">
                {currentPackage.inspection.filesOnly.length}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <FolderTree className="w-3.5 h-3.5" />
                Folders
              </div>
              <div className="text-lg font-bold text-slate-100 font-mono tabular-nums">
                {currentPackage.inspection.validation.stats.totalFolders}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                Extracted Size
              </div>
              <div className="text-lg font-bold text-slate-100 font-mono tabular-nums">
                {formatBytes(currentPackage.inspection.validation.stats.totalUncompressedBytes)}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <Layers className="w-3.5 h-3.5" />
                Detected Root
              </div>
              <div className="text-xs font-mono font-bold text-slate-200 truncate" title={currentPackage.inspection.rootInfo.detectedRoot || 'Direct Root'}>
                {currentPackage.inspection.rootInfo.detectedRoot || 'Direct Flat Root'}
              </div>
            </div>
          </div>

          {/* Root Wrapper Indicator */}
          {currentPackage.inspection.rootInfo.hasWrapperFolder && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Outer wrapper folder <strong className="font-mono text-amber-300">{currentPackage.inspection.rootInfo.detectedRoot}</strong> detected. Pack2Git can strip it automatically to place files directly at the repository root.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ready-made Test Packages */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ready-made Test Packages</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Instant evaluation without local files
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_PROJECTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={isLoading || loadingSampleId !== null}
              onClick={() => handleLoadSample(sample.id)}
              className="text-left p-3.5 rounded-xl bg-[#0c101d] hover:bg-[#111627] border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group cursor-pointer disabled:opacity-50"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300">
                    {sample.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {sample.tag}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 font-mono">
                <span>{loadingSampleId === sample.id ? 'Generating...' : 'Load Sample'}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
