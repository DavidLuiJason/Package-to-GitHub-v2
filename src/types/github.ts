export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
  plan?: {
    name: string;
  };
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  created_at: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url?: string;
}

export interface PublishConfig {
  repoName: string;
  description: string;
  isPrivate: boolean;
  autoInit?: boolean;
}

export type PublishPhase =
  | 'idle'
  | 'authenticating'
  | 'checking_repo'
  | 'creating_repo'
  | 'uploading_blobs'
  | 'building_tree'
  | 'creating_commit'
  | 'updating_ref'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface PublishProgress {
  phase: PublishPhase;
  phaseLabel: string;
  currentStep: number;
  totalSteps: number;
  percent: number;
  currentFile?: string;
  uploadedFilesCount: number;
  totalFilesCount: number;
  errorMessage?: string;
  partialRepoUrl?: string;
  createdRepo?: GitHubRepo;
  commitSha?: string;
  verification?: RepoVerificationResult;
}

export interface RepoVerificationResult {
  isVerified: boolean;
  expectedFilesCount: number;
  actualFilesCount: number;
  matchedFilesCount: number;
  missingFiles: string[];
  extraFiles: string[];
  commitSha: string;
  treeSha: string;
  verifiedAt: string;
  repoUrl: string;
  defaultBranch: string;
}
