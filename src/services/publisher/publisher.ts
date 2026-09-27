import { ArchivePackage } from '../archive/archiveReader';
import { ArchiveEntry, ProjectManifest } from '../../types/archive';
import { GitHubRepo, PublishConfig, PublishProgress } from '../../types/github';
import { GitHubClient } from '../github/githubClient';
import { verifyPublishedRepo } from '../verification/verifier';

export interface PublishCallbacks {
  onProgress: (progress: PublishProgress) => void;
}

export class ProjectPublisher {
  private client: GitHubClient;
  private pkg: ArchivePackage;
  private config: PublishConfig;
  private abortController: AbortController | null = null;

  constructor(client: GitHubClient, pkg: ArchivePackage, config: PublishConfig) {
    this.client = client;
    this.pkg = pkg;
    this.config = config;
  }

  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  public async publish(callbacks: PublishCallbacks): Promise<{
    manifest: ProjectManifest;
    repo: GitHubRepo;
    commitSha: string;
  }> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const filesToUpload: ArchiveEntry[] = this.pkg.inspection.filesOnly;
    const totalFiles = filesToUpload.length;

    let createdRepo: GitHubRepo | undefined;
    let commitSha: string | undefined;

    const update = (partial: Partial<PublishProgress>) => {
      callbacks.onProgress({
        phase: 'idle',
        phaseLabel: 'Initializing',
        currentStep: 1,
        totalSteps: 6,
        percent: 0,
        uploadedFilesCount: 0,
        totalFilesCount: totalFiles,
        createdRepo,
        commitSha,
        ...partial,
      });
    };

    try {
      // Step 1: Authenticate and get user
      update({
        phase: 'authenticating',
        phaseLabel: 'Verifying GitHub credentials',
        currentStep: 1,
        percent: 5,
      });

      if (signal.aborted) throw new Error('Operation cancelled by user.');
      const user = await this.client.getAuthenticatedUser();

      // Step 2: Check repo name availability
      update({
        phase: 'checking_repo',
        phaseLabel: `Checking repository name "${this.config.repoName}" availability`,
        currentStep: 2,
        percent: 15,
      });

      if (signal.aborted) throw new Error('Operation cancelled by user.');
      const exists = await this.client.repoExists(user.login, this.config.repoName);
      if (exists) {
        throw new Error(
          `Repository "${user.login}/${this.config.repoName}" already exists on your GitHub account. Please choose a different repository name.`
        );
      }

      // Step 3: Create repository
      update({
        phase: 'creating_repo',
        phaseLabel: `Creating new repository "${this.config.repoName}"`,
        currentStep: 3,
        percent: 25,
      });

      if (signal.aborted) throw new Error('Operation cancelled by user.');
      createdRepo = await this.client.createRepository(
        this.config.repoName,
        this.config.description,
        this.config.isPrivate
      );

      const branchName = createdRepo.default_branch || 'main';

      update({
        phase: 'creating_repo',
        phaseLabel: `Initializing repository git object database`,
        currentStep: 3,
        percent: 28,
        createdRepo,
        partialRepoUrl: createdRepo.html_url,
      });

      // Wait for GitHub to initialize Git object database
      if (signal.aborted) throw new Error('Operation cancelled by user.');
      const initialCommitSha = await this.client.waitForRepoInitialized(
        user.login,
        createdRepo.name,
        branchName
      );

      // Step 4: Upload Blobs (staged with concurrency limit)
      update({
        phase: 'uploading_blobs',
        phaseLabel: `Uploading project files (0 of ${totalFiles})`,
        currentStep: 4,
        percent: 30,
        createdRepo,
        partialRepoUrl: createdRepo.html_url,
      });

      const treeItems: Array<{
        path: string;
        mode: '100644' | '100755';
        type: 'blob';
        sha: string;
      }> = [];

      let uploadedCount = 0;
      const CONCURRENCY_LIMIT = 4;

      // Process in batches
      for (let i = 0; i < filesToUpload.length; i += CONCURRENCY_LIMIT) {
        if (signal.aborted) throw new Error('Operation cancelled by user.');

        const batch = filesToUpload.slice(i, i + CONCURRENCY_LIMIT);

        const batchPromises = batch.map(async (fileEntry) => {
          if (signal.aborted) return;

          // Lazy load base64 content
          const base64 = await this.pkg.getFileBase64(fileEntry.path);
          const blob = await this.client.createBlob(user.login, createdRepo!.name, base64, branchName);

          // Determine mode: 100755 for shell scripts / executables, 100644 for others
          const isExecutable =
            fileEntry.repoPath.endsWith('.sh') ||
            fileEntry.repoPath.endsWith('.bash') ||
            fileEntry.repoPath.startsWith('bin/');
          const mode: '100644' | '100755' = isExecutable ? '100755' : '100644';

          treeItems.push({
            path: fileEntry.repoPath,
            mode,
            type: 'blob',
            sha: blob.sha,
          });

          uploadedCount++;
          const percent = 30 + Math.floor((uploadedCount / totalFiles) * 45); // 30% to 75%

          update({
            phase: 'uploading_blobs',
            phaseLabel: `Uploading project files (${uploadedCount} of ${totalFiles})`,
            currentStep: 4,
            percent,
            currentFile: fileEntry.repoPath,
            uploadedFilesCount: uploadedCount,
            totalFilesCount: totalFiles,
            createdRepo,
            partialRepoUrl: createdRepo!.html_url,
          });
        });

        await Promise.all(batchPromises);

        // Small yield to let React UI render smoothly
        await new Promise((r) => setTimeout(r, 10));
      }

      // Step 5: Build Git Tree
      update({
        phase: 'building_tree',
        phaseLabel: 'Building Git directory tree structure',
        currentStep: 5,
        percent: 80,
        uploadedFilesCount: totalFiles,
        createdRepo,
      });

      if (signal.aborted) throw new Error('Operation cancelled by user.');
      const tree = await this.client.createTree(user.login, createdRepo.name, treeItems);

      // Step 6: Create Git Commit
      update({
        phase: 'creating_commit',
        phaseLabel: 'Creating initial Git commit',
        currentStep: 5,
        percent: 85,
        createdRepo,
      });

      if (signal.aborted) throw new Error('Operation cancelled by user.');
      const commit = await this.client.createCommit(
        user.login,
        createdRepo.name,
        `Initial commit: ${this.pkg.inspection.fileName} via Pack2Git`,
        tree.sha,
        initialCommitSha ? [initialCommitSha] : []
      );
      commitSha = commit.sha;

      // Step 7: Update default branch ref
      update({
        phase: 'updating_ref',
        phaseLabel: `Publishing ${branchName} branch reference`,
        currentStep: 5,
        percent: 90,
        createdRepo,
        commitSha,
      });

      if (signal.aborted) throw new Error('Operation cancelled by user.');
      await this.client.setBranchRef(user.login, createdRepo.name, branchName, commitSha);

      // Step 8: Post-Publish Independent Verification
      update({
        phase: 'verifying',
        phaseLabel: 'Verifying repository tree on GitHub',
        currentStep: 6,
        percent: 95,
        createdRepo,
        commitSha,
      });

      if (signal.aborted) throw new Error('Operation cancelled by user.');
      const verification = await verifyPublishedRepo(
        this.client,
        user.login,
        createdRepo.name,
        commitSha,
        tree.sha,
        filesToUpload,
        branchName
      );

      if (!verification.isVerified) {
        throw new Error(
          `Verification mismatch: Expected ${verification.expectedFilesCount} files, but found ${verification.actualFilesCount} on GitHub. Missing: ${verification.missingFiles.join(', ')}`
        );
      }

      // Complete! Build manifest
      const manifest: ProjectManifest = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        sourceArchive: {
          fileName: this.pkg.fileName,
          fileSizeBytes: this.pkg.fileSizeBytes,
          totalFiles: this.pkg.inspection.validation.stats.totalFiles,
          totalFolders: this.pkg.inspection.validation.stats.totalFolders,
          totalUncompressedBytes: this.pkg.inspection.validation.stats.totalUncompressedBytes,
        },
        projectRoot: {
          detected: this.pkg.inspection.rootInfo.detectedRoot,
          stripped: this.pkg.inspection.useRootStripping,
          reason: this.pkg.inspection.rootInfo.reason,
        },
        projectType: this.pkg.inspection.validation.detectedProjectType,
        majorFiles: this.pkg.inspection.validation.majorFilesFound,
        validation: {
          status: this.pkg.inspection.validation.isValid ? 'passed' : 'warning',
          warningsCount: this.pkg.inspection.validation.issues.filter((i) => i.type === 'warning').length,
          errorsCount: this.pkg.inspection.validation.issues.filter((i) => i.type === 'error').length,
        },
        publication: {
          publishedAt: new Date().toISOString(),
          repository: {
            owner: user.login,
            name: createdRepo.name,
            fullName: createdRepo.full_name,
            url: createdRepo.html_url,
            visibility: createdRepo.private ? 'private' : 'public',
            defaultBranch: branchName,
          },
          git: {
            commitSha,
            treeSha: tree.sha,
            commitMessage: `Initial commit: ${this.pkg.inspection.fileName} via Pack2Git`,
            publishedFilesCount: treeItems.length,
          },
          verification: {
            verifiedAt: verification.verifiedAt,
            isVerified: verification.isVerified,
            expectedFilesCount: verification.expectedFilesCount,
            actualFilesCount: verification.actualFilesCount,
            missingFiles: verification.missingFiles,
            unexpectedFiles: verification.extraFiles,
          },
        },
      };

      update({
        phase: 'completed',
        phaseLabel: 'Repository successfully published and verified!',
        currentStep: 6,
        percent: 100,
        createdRepo,
        commitSha,
        verification,
      });

      return {
        manifest,
        repo: createdRepo,
        commitSha,
      };
    } catch (err: any) {
      update({
        phase: 'failed',
        phaseLabel: 'Publishing stopped due to an error',
        errorMessage: err.message || 'An unexpected error occurred during publishing.',
        createdRepo,
        commitSha,
        partialRepoUrl: createdRepo?.html_url,
      });
      throw err;
    }
  }
}
