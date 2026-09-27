export interface ArchiveEntry {
  path: string;            // Original relative path in the ZIP
  normalizedPath: string;  // Path after removing leading slashes/normalizing
  repoPath: string;        // Final path as it will appear in the GitHub repo root
  size: number;            // Uncompressed size in bytes
  compressedSize: number;  // Compressed size in bytes
  isDirectory: boolean;
  date: Date;
}

export type ProjectType =
  | 'React'
  | 'Vite'
  | 'Next.js'
  | 'Node.js'
  | 'TypeScript'
  | 'Python'
  | 'Rust'
  | 'Go'
  | 'Static Web'
  | 'General Project';

export interface ProjectRootInfo {
  detectedRoot: string;          // e.g. "my-project/" or "" (if already root)
  hasWrapperFolder: boolean;
  reason: string;
  allEntriesShareRoot: boolean;
  sampleIndicatorFiles: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  details?: string;
  affectedPath?: string;
}

export interface ValidationReport {
  isValid: boolean;
  canPublish: boolean;
  issues: ValidationIssue[];
  checks: {
    name: string;
    passed: boolean;
    description: string;
  }[];
  stats: {
    totalFiles: number;
    totalFolders: number;
    totalUncompressedBytes: number;
    totalCompressedBytes: number;
    largestFile?: {
      path: string;
      size: number;
    };
  };
  detectedProjectType: ProjectType;
  majorFilesFound: string[];
}

export interface ProjectInspection {
  fileName: string;
  fileSizeBytes: number;
  entries: ArchiveEntry[];
  filesOnly: ArchiveEntry[];
  rootInfo: ProjectRootInfo;
  validation: ValidationReport;
  useRootStripping: boolean; // whether to strip the wrapper folder
}

export interface ProjectManifest {
  version: string;
  createdAt: string;
  sourceArchive: {
    fileName: string;
    fileSizeBytes: number;
    totalFiles: number;
    totalFolders: number;
    totalUncompressedBytes: number;
  };
  projectRoot: {
    detected: string;
    stripped: boolean;
    reason: string;
  };
  projectType: ProjectType;
  majorFiles: string[];
  validation: {
    status: 'passed' | 'warning' | 'failed';
    warningsCount: number;
    errorsCount: number;
  };
  publication?: {
    publishedAt: string;
    repository: {
      owner: string;
      name: string;
      fullName: string;
      url: string;
      visibility: 'public' | 'private';
      defaultBranch: string;
    };
    git: {
      commitSha: string;
      treeSha: string;
      commitMessage: string;
      publishedFilesCount: number;
    };
    verification: {
      verifiedAt: string;
      isVerified: boolean;
      expectedFilesCount: number;
      actualFilesCount: number;
      missingFiles: string[];
      unexpectedFiles: string[];
    };
  };
}
