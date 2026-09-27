import React, { useState } from 'react';
import { Header } from './components/Header';
import { WorkspaceSidebar, WorkspaceView } from './components/WorkspaceSidebar';
import { Phase1_Input } from './components/Phase1_Input';
import { Phase2_Preview } from './components/Phase2_Preview';
import { Phase3_Configure } from './components/Phase3_Configure';
import { Phase4_Publishing } from './components/Phase4_Publishing';
import { Phase5_Verified } from './components/Phase5_Verified';
import { FailureView } from './components/FailureView';
import { ManifestModal } from './components/ManifestModal';
import { ArchivePackage } from './services/archive/archiveReader';
import { GitHubClient } from './services/github/githubClient';
import { GitHubUser, PublishConfig, PublishProgress } from './types/github';
import { ProjectPublisher } from './services/publisher/publisher';
import { ProjectManifest } from './types/archive';

export default function App() {
  const [currentView, setCurrentView] = useState<WorkspaceView>('input');
  const [archivePackage, setArchivePackage] = useState<ArchivePackage | null>(null);

  // GitHub Auth in-memory state
  const [gitHubClient, setGitHubClient] = useState<GitHubClient | null>(null);
  const [gitHubUser, setGitHubUser] = useState<GitHubUser | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | undefined>(undefined);

  // Publishing & Progress state
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null);
  const [activePublisher, setActivePublisher] = useState<ProjectPublisher | null>(null);
  const [lastConfig, setLastConfig] = useState<PublishConfig | null>(null);
  const [finalManifest, setFinalManifest] = useState<ProjectManifest | null>(null);
  const [isManifestOpen, setIsManifestOpen] = useState(false);

  // Mobile navigation state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Handle Token Connect
  const handleConnectToken = async (token: string) => {
    const client = new GitHubClient(token);
    const user = await client.getAuthenticatedUser();
    const rate = await client.getRateLimit().catch(() => undefined);

    setGitHubClient(client);
    setGitHubUser(user);
    if (rate) setRateLimitRemaining(rate.remaining);
  };

  // Handle Token Disconnect
  const handleDisconnect = () => {
    setGitHubClient(null);
    setGitHubUser(null);
    setRateLimitRemaining(undefined);
  };

  // Handle Archive Selected
  const handleArchiveLoaded = (pkg: ArchivePackage) => {
    setArchivePackage(pkg);
  };

  // Handle Root Stripping toggle
  const handleUpdateRootStripping = (strip: boolean) => {
    if (!archivePackage) return;
    archivePackage.updateRootStripping(strip);
    // Clone instance reference to trigger React re-render
    setArchivePackage(Object.assign(Object.create(Object.getPrototypeOf(archivePackage)), archivePackage));
  };

  // Handle Start Publishing
  const handleStartPublish = async (config: PublishConfig) => {
    if (!gitHubClient || !archivePackage) return;

    setLastConfig(config);
    setCurrentView('publishing');

    const publisher = new ProjectPublisher(gitHubClient, archivePackage, config);
    setActivePublisher(publisher);

    try {
      const result = await publisher.publish({
        onProgress: (progress) => {
          setPublishProgress(progress);
        },
      });

      setFinalManifest(result.manifest);
      setCurrentView('verified');
    } catch (err: any) {
      console.error('Publish error:', err);
    }
  };

  // Handle Cancel
  const handleCancelPublish = () => {
    if (activePublisher) {
      activePublisher.cancel();
    }
  };

  // Reset entire flow
  const handleReset = () => {
    setArchivePackage(null);
    setPublishProgress(null);
    setActivePublisher(null);
    setLastConfig(null);
    setFinalManifest(null);
    setCurrentView('input');
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Bar Contract: Brand + Workspace Breadcrumbs + Account */}
      <Header
        user={gitHubUser}
        onDisconnect={handleDisconnect}
        onReset={handleReset}
        rateLimitRemaining={rateLimitRemaining}
        activeFileName={archivePackage?.fileName}
        activeRepoName={lastConfig?.repoName}
        onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
      />

      {/* Workspace Body: Left Sidebar + Main Content Viewport */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Navigation Sidebar */}
        <WorkspaceSidebar
          currentView={currentView}
          onSelectView={(view) => setCurrentView(view)}
          pkg={archivePackage}
          user={gitHubUser}
          publishProgress={publishProgress}
          repoConfig={lastConfig}
          isOpenMobile={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          onOpenManifest={() => setIsManifestOpen(true)}
        />

        {/* Main Workspace Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#090d16]">
          {/* View 1: Package Ingestion */}
          {currentView === 'input' && (
            <Phase1_Input
              currentPackage={archivePackage}
              onArchiveLoaded={handleArchiveLoaded}
              onProceed={() => setCurrentView('preview')}
            />
          )}

          {/* View 2: Root Detection, Inspection & Validation */}
          {currentView === 'preview' && archivePackage && (
            <Phase2_Preview
              pkg={archivePackage}
              onUpdateRootStripping={handleUpdateRootStripping}
              onBack={() => setCurrentView('input')}
              onProceed={() => setCurrentView('configure')}
            />
          )}

          {/* View 3: GitHub Auth & Repository Configuration */}
          {currentView === 'configure' && archivePackage && (
            <Phase3_Configure
              pkg={archivePackage}
              client={gitHubClient}
              user={gitHubUser}
              onConnectToken={handleConnectToken}
              onDisconnect={handleDisconnect}
              onBack={() => setCurrentView('preview')}
              onStartPublish={handleStartPublish}
            />
          )}

          {/* View 4: Live Publishing Pipeline OR Failure Diagnosis */}
          {currentView === 'publishing' && publishProgress && (
            <>
              {publishProgress.phase === 'failed' ? (
                <FailureView
                  progress={publishProgress}
                  client={gitHubClient}
                  onRetry={() => lastConfig && handleStartPublish(lastConfig)}
                  onBackToConfig={() => setCurrentView('configure')}
                  onReset={handleReset}
                />
              ) : (
                <Phase4_Publishing
                  progress={publishProgress}
                  onCancel={handleCancelPublish}
                />
              )}
            </>
          )}

          {/* View 5: Post-Publish Verification Cockpit */}
          {currentView === 'verified' && finalManifest && publishProgress?.verification && (
            <Phase5_Verified
              manifest={finalManifest}
              verification={publishProgress.verification}
              onPublishAnother={handleReset}
              onViewManifest={() => setIsManifestOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Internal Manifest Viewer Modal */}
      <ManifestModal
        manifest={finalManifest}
        isOpen={isManifestOpen}
        onClose={() => setIsManifestOpen(false)}
      />
    </div>
  );
}
