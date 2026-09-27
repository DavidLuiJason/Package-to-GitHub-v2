import React from 'react';
import {
  Archive,
  Layers,
  ShieldCheck,
  Key,
  FolderGit2,
  UploadCloud,
  CheckCircle2,
  FileText,
  AlertTriangle,
  X,
  ExternalLink,
} from 'lucide-react';
import { ArchivePackage } from '../services/archive/archiveReader';
import { GitHubUser, PublishConfig, PublishProgress } from '../types/github';

export type WorkspaceView =
  | 'input'
  | 'preview'
  | 'configure'
  | 'publishing'
  | 'verified';

interface WorkspaceSidebarProps {
  currentView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  pkg: ArchivePackage | null;
  user: GitHubUser | null;
  publishProgress: PublishProgress | null;
  repoConfig: PublishConfig | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenManifest: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  currentView,
  onSelectView,
  pkg,
  user,
  publishProgress,
  repoConfig,
  isOpenMobile,
  onCloseMobile,
  onOpenManifest,
}) => {
  const isInputComplete = Boolean(pkg);
  const isValid = Boolean(pkg?.inspection.validation.isValid);
  const isAuth = Boolean(user);
  const isPublishing = currentView === 'publishing';
  const isVerified = currentView === 'verified';

  const navItems = [
    {
      group: 'WORKSPACE',
      items: [
        {
          id: 'input' as WorkspaceView,
          label: 'Package Ingest',
          subtext: pkg ? pkg.fileName : 'Select or drop ZIP',
          icon: Archive,
          enabled: true,
          status: pkg ? 'ready' : 'idle',
        },
        {
          id: 'preview' as WorkspaceView,
          label: 'Root & Structure',
          subtext: pkg
            ? pkg.inspection.rootInfo.hasWrapperFolder
              ? `Outer wrapper: ${pkg.inspection.rootInfo.detectedRoot}`
              : 'Direct flat root'
            : 'Pending package',
          icon: Layers,
          enabled: isInputComplete,
          status: pkg ? (pkg.inspection.useRootStripping ? 'stripped' : 'retained') : 'idle',
        },
        {
          id: 'preview' as WorkspaceView,
          label: 'Validation & Rules',
          subtext: pkg
            ? isValid
              ? `${pkg.inspection.filesOnly.length} files valid`
              : 'Issues detected'
            : 'Pending package',
          icon: ShieldCheck,
          enabled: isInputComplete,
          status: pkg ? (isValid ? 'valid' : 'warning') : 'idle',
        },
      ],
    },
    {
      group: 'GITHUB',
      items: [
        {
          id: 'configure' as WorkspaceView,
          label: 'Authentication',
          subtext: user ? `@${user.login}` : 'Session token required',
          icon: Key,
          enabled: isInputComplete,
          status: user ? 'connected' : 'idle',
        },
        {
          id: 'configure' as WorkspaceView,
          label: 'Repository Setup',
          subtext: repoConfig?.repoName
            ? `${repoConfig.repoName} (${repoConfig.isPrivate ? 'Private' : 'Public'})`
            : 'Configure name & visibility',
          icon: FolderGit2,
          enabled: isInputComplete,
          status: repoConfig?.repoName ? 'ready' : 'idle',
        },
      ],
    },
    {
      group: 'PUBLISH & VERIFY',
      items: [
        {
          id: 'publishing' as WorkspaceView,
          label: 'Publishing Pipeline',
          subtext: isPublishing
            ? `${publishProgress?.percent || 0}% · ${publishProgress?.phaseLabel || 'Running'}`
            : isVerified
            ? 'Completed'
            : 'Awaiting launch',
          icon: UploadCloud,
          enabled: isPublishing || isVerified,
          status: isPublishing ? 'active' : isVerified ? 'valid' : 'idle',
        },
        {
          id: 'verified' as WorkspaceView,
          label: 'Verification Cockpit',
          subtext: isVerified ? '100% Tree Match' : 'Post-publish check',
          icon: CheckCircle2,
          enabled: isVerified,
          status: isVerified ? 'valid' : 'idle',
        },
      ],
    },
  ];

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-14 bottom-0 left-0 z-40 w-72 bg-[#0a0e1a] border-r border-slate-800/80 flex flex-col transition-transform duration-200 lg:static lg:top-0 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header in Drawer */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80 lg:hidden">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Workspace Navigation
          </span>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navItems.map((section) => (
            <div key={section.group} className="space-y-1.5">
              <div className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider">
                {section.group}
              </div>

              <div className="space-y-1">
                {section.items.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  const isClickable = item.enabled && !isPublishing;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!isClickable}
                      onClick={() => {
                        if (isClickable) {
                          onSelectView(item.id);
                          onCloseMobile();
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-200 border border-indigo-500/30'
                          : isClickable
                          ? 'text-slate-300 hover:bg-slate-850 hover:text-slate-100 cursor-pointer'
                          : 'text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive
                              ? 'text-indigo-400'
                              : item.status === 'valid' || item.status === 'ready'
                              ? 'text-emerald-400'
                              : item.status === 'warning'
                              ? 'text-amber-400'
                              : 'text-slate-500'
                          }`}
                        />
                        <div className="truncate">
                          <span className="block text-xs font-medium truncate">
                            {item.label}
                          </span>
                          <span className="block text-[11px] text-slate-400 truncate font-mono">
                            {item.subtext}
                          </span>
                        </div>
                      </div>

                      {/* Quiet status dot indicator */}
                      <span className="shrink-0 flex items-center">
                        {item.status === 'valid' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                        {item.status === 'ready' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        )}
                        {item.status === 'warning' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        )}
                        {item.status === 'active' && (
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* INTERNAL TOOLS */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="px-3 text-[11px] font-semibold text-slate-400 tracking-wider">
              INTERNAL ARTIFACTS
            </div>
            <button
              type="button"
              onClick={onOpenManifest}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-850 hover:text-slate-100 transition-colors cursor-pointer text-left"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <div>
                <span className="block font-medium">Publishing Manifest</span>
                <span className="block text-[11px] text-slate-400 font-mono">
                  View JSON report
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom Workspace Summary Card */}
        {pkg && (
          <div className="p-3 border-t border-slate-800/80 bg-[#080c16]">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-slate-400">
                  Target Context
                </span>
                <span className="font-mono text-indigo-400">
                  {pkg.inspection.validation.detectedProjectType}
                </span>
              </div>

              <div className="text-slate-200 font-medium truncate" title={pkg.fileName}>
                {pkg.fileName}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums pt-1 border-t border-slate-800/60">
                <span>{pkg.inspection.filesOnly.length} files</span>
                <span>{formatBytes(pkg.inspection.validation.stats.totalUncompressedBytes)}</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
