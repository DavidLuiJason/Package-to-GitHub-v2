import { ArchiveEntry, ProjectType, ValidationIssue, ValidationReport } from '../../types/archive';

const MAX_RECOMMENDED_FILES = 1500;
const MAX_RECOMMENDED_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB warning
const MAX_SINGLE_FILE_SIZE = 100 * 1024 * 1024; // 100MB GitHub REST API blob limit
const LARGE_FILE_WARNING_SIZE = 25 * 1024 * 1024; // 25MB warning

export function validateArchive(
  entries: ArchiveEntry[],
  rawFileSizeBytes: number
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const filesOnly = entries.filter((e) => !e.isDirectory && e.repoPath.length > 0);
  const totalFolders = entries.filter((e) => e.isDirectory).length;

  let totalUncompressedBytes = 0;
  let totalCompressedBytes = 0;
  let largestFile: { path: string; size: number } | undefined;

  const seenRepoPaths = new Set<string>();
  const duplicatePaths = new Set<string>();

  // Check 1: Empty project
  if (filesOnly.length === 0) {
    issues.push({
      type: 'error',
      code: 'EMPTY_PROJECT',
      message: 'The archive does not contain any publishable files.',
      details: 'A GitHub repository cannot be initialized without at least one file.',
    });
  }

  // Check 2: Path traversal & validity
  for (const entry of filesOnly) {
    totalUncompressedBytes += entry.size;
    totalCompressedBytes += entry.compressedSize;

    if (!largestFile || entry.size > largestFile.size) {
      largestFile = { path: entry.repoPath, size: entry.size };
    }

    // Path Traversal checks
    const rawPath = entry.path;
    const repoPath = entry.repoPath;

    if (
      rawPath.includes('../') ||
      rawPath.includes('..\\') ||
      rawPath.startsWith('/') ||
      rawPath.startsWith('\\')
    ) {
      issues.push({
        type: 'error',
        code: 'PATH_TRAVERSAL_DETECTED',
        message: `Dangerous path traversal entry detected: "${rawPath}"`,
        details: 'Paths containing "../" or leading slashes are rejected for security.',
        affectedPath: rawPath,
      });
    }

    // Check for null characters or illegal control chars
    // eslint-disable-next-line no-control-regex
    if (/[\x00-\x1f\x7f]/.test(rawPath)) {
      issues.push({
        type: 'error',
        code: 'MALFORMED_FILENAME',
        message: `Illegal control character found in filename: "${rawPath}"`,
        affectedPath: rawPath,
      });
    }

    // Duplicate check on final repo path
    const normalizedRepo = repoPath.toLowerCase();
    if (seenRepoPaths.has(normalizedRepo)) {
      duplicatePaths.add(repoPath);
    } else {
      seenRepoPaths.add(normalizedRepo);
    }

    // Single file size limit
    if (entry.size > MAX_SINGLE_FILE_SIZE) {
      issues.push({
        type: 'error',
        code: 'FILE_TOO_LARGE',
        message: `File "${repoPath}" is ${(entry.size / (1024 * 1024)).toFixed(1)}MB, exceeding GitHub's 100MB API limit.`,
        details: 'GitHub Git Data API cannot upload blobs exceeding 100MB.',
        affectedPath: repoPath,
      });
    } else if (entry.size > LARGE_FILE_WARNING_SIZE) {
      issues.push({
        type: 'warning',
        code: 'LARGE_FILE_WARNING',
        message: `Large file "${repoPath}" (${(entry.size / (1024 * 1024)).toFixed(1)}MB) may take longer to upload.`,
        affectedPath: repoPath,
      });
    }

    // Git internal folders check (.git inside project)
    if (repoPath.startsWith('.git/') || repoPath === '.git') {
      issues.push({
        type: 'warning',
        code: 'EMBEDDED_GIT_DIR',
        message: `Archive contains an embedded ".git" directory entry: "${repoPath}"`,
        details: 'Internal .git repository state files should typically not be re-published as loose blobs.',
        affectedPath: repoPath,
      });
    }

    // macOS metadata junk
    if (repoPath.includes('__MACOSX/') || repoPath.endsWith('.DS_Store')) {
      issues.push({
        type: 'info',
        code: 'SYSTEM_METADATA_DETECTED',
        message: `System metadata file detected: "${repoPath}"`,
        details: 'This is standard operating system metadata.',
        affectedPath: repoPath,
      });
    }

    // Windows reserved filenames (CON, PRN, AUX, NUL, COM1..9, LPT1..9)
    const fileNameOnly = repoPath.split('/').pop() || '';
    const baseName = fileNameOnly.split('.')[0].toUpperCase();
    if (['CON', 'PRN', 'AUX', 'NUL'].includes(baseName) || /^(COM|LPT)[1-9]$/.test(baseName)) {
      issues.push({
        type: 'warning',
        code: 'RESERVED_FILENAME_WINDOWS',
        message: `Filename "${fileNameOnly}" is a reserved system name on Windows and may cause issues when cloned on Windows machines.`,
        affectedPath: repoPath,
      });
    }
  }

  // Duplicate paths check summary
  if (duplicatePaths.size > 0) {
    issues.push({
      type: 'error',
      code: 'DUPLICATE_PATHS_DETECTED',
      message: `Found ${duplicatePaths.size} case-insensitive duplicate destination path(s): ${Array.from(duplicatePaths).slice(0, 3).join(', ')}`,
      details: 'Git and case-insensitive filesystems cannot resolve duplicate file paths.',
    });
  }

  // Check 3: File count warnings
  if (filesOnly.length > MAX_RECOMMENDED_FILES) {
    issues.push({
      type: 'warning',
      code: 'HIGH_FILE_COUNT',
      message: `High file count: ${filesOnly.length} files. Uploading to GitHub will make ${filesOnly.length} API calls and may approach rate limits.`,
      details: 'Authenticated GitHub accounts have 5,000 requests/hour.',
    });
  }

  // Check 4: Total archive size warning
  if (totalUncompressedBytes > MAX_RECOMMENDED_TOTAL_SIZE) {
    issues.push({
      type: 'warning',
      code: 'LARGE_TOTAL_SIZE',
      message: `Total uncompressed size is ${(totalUncompressedBytes / (1024 * 1024)).toFixed(1)}MB.`,
      details: 'Publishing large archives will take additional time.',
    });
  }

  // Detect project type
  const { projectType, majorFiles } = detectProjectType(filesOnly.map((f) => f.repoPath));

  // Determine pass/fail
  const hasErrors = issues.some((i) => i.type === 'error');
  const hasWarnings = issues.some((i) => i.type === 'warning');

  const checks = [
    {
      name: 'Archive readable',
      passed: true,
      description: 'ZIP container and central directory headers parsed successfully',
    },
    {
      name: 'Paths valid & safe',
      passed: !issues.some((i) => i.code === 'PATH_TRAVERSAL_DETECTED' || i.code === 'MALFORMED_FILENAME'),
      description: 'No directory traversal or dangerous control characters',
    },
    {
      name: 'No duplicate paths',
      passed: duplicatePaths.size === 0,
      description: 'All destination repository paths are distinct and unique',
    },
    {
      name: 'File sizes within limits',
      passed: !issues.some((i) => i.code === 'FILE_TOO_LARGE'),
      description: 'All files are under GitHub API 100MB individual blob limit',
    },
    {
      name: 'Contains publishable files',
      passed: filesOnly.length > 0,
      description: 'At least one file is available to commit to the repository',
    },
  ];

  return {
    isValid: !hasErrors,
    canPublish: !hasErrors,
    issues,
    checks,
    stats: {
      totalFiles: filesOnly.length,
      totalFolders,
      totalUncompressedBytes,
      totalCompressedBytes,
      largestFile,
    },
    detectedProjectType: projectType,
    majorFilesFound: majorFiles,
  };
}

function detectProjectType(paths: string[]): { projectType: ProjectType; majorFiles: string[] } {
  const pathSet = new Set(paths);
  const majorFiles: string[] = [];

  const has = (name: string) => {
    const found = paths.some((p) => p === name || p.endsWith('/' + name));
    if (found) majorFiles.push(name);
    return found;
  };

  const hasPrefix = (prefix: string) => paths.some((p) => p.startsWith(prefix));

  const hasPackageJson = has('package.json');
  const hasTsConfig = has('tsconfig.json');
  const hasVite = has('vite.config.ts') || has('vite.config.js');
  const hasNext = has('next.config.js') || has('next.config.ts') || has('next.config.mjs');
  const hasIndexHtml = has('index.html');
  const hasRequirements = has('requirements.txt') || has('pyproject.toml') || has('setup.py');
  const hasCargo = has('Cargo.toml');
  const hasGoMod = has('go.mod');
  has('README.md');
  has('src');
  has('public');

  if (hasNext) return { projectType: 'Next.js', majorFiles };
  if (hasVite) return { projectType: 'Vite', majorFiles };
  if (hasPackageJson && (paths.some((p) => p.includes('react') || p.includes('React')) || hasIndexHtml)) {
    return { projectType: 'React', majorFiles };
  }
  if (hasTsConfig && hasPackageJson) return { projectType: 'TypeScript', majorFiles };
  if (hasPackageJson) return { projectType: 'Node.js', majorFiles };
  if (hasRequirements || paths.some((p) => p.endsWith('.py'))) return { projectType: 'Python', majorFiles };
  if (hasCargo) return { projectType: 'Rust', majorFiles };
  if (hasGoMod) return { projectType: 'Go', majorFiles };
  if (hasIndexHtml) return { projectType: 'Static Web', majorFiles };

  return { projectType: 'General Project', majorFiles };
}
