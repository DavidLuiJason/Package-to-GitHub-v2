import { ArchiveEntry, ProjectRootInfo } from '../../types/archive';

const PROJECT_ROOT_INDICATORS = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'webpack.config.js',
  'index.html',
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  'Cargo.toml',
  'go.mod',
  'Makefile',
  'CMakeLists.txt',
  'pom.xml',
  'build.gradle',
  'composer.json',
  'README.md',
  'README',
  'src/',
  'public/',
  'app/',
  'lib/',
  'bin/'
];

export function detectProjectRoot(rawPaths: string[]): ProjectRootInfo {
  // Filter out system junk like __MACOSX and empty paths
  const cleanPaths = rawPaths.filter((p) => {
    const clean = p.replace(/^\/+/, '');
    return clean && !clean.startsWith('__MACOSX/') && clean !== '.DS_Store';
  });

  if (cleanPaths.length === 0) {
    return {
      detectedRoot: '',
      hasWrapperFolder: false,
      reason: 'Archive contains no non-system files.',
      allEntriesShareRoot: false,
      sampleIndicatorFiles: [],
    };
  }

  // Get the top-level segment for each path
  const topSegments = new Set<string>();
  const topLevelFiles: string[] = [];

  for (const path of cleanPaths) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 0) {
      topSegments.add(parts[0]);
      if (parts.length === 1 && !path.endsWith('/')) {
        topLevelFiles.push(parts[0]);
      }
    }
  }

  // If there are multiple different top-level items, or top-level files exist alongside folders
  if (topSegments.size > 1) {
    // Project root is already at top level
    const indicatorsAtRoot = cleanPaths.filter((p) =>
      PROJECT_ROOT_INDICATORS.some((ind) =>
        ind.endsWith('/') ? p.startsWith(ind) : p === ind
      )
    );

    return {
      detectedRoot: '',
      hasWrapperFolder: false,
      reason: `Found ${topSegments.size} top-level entries (${Array.from(topSegments).slice(0, 3).join(', ')}...). Structure is already flat.`,
      allEntriesShareRoot: false,
      sampleIndicatorFiles: indicatorsAtRoot.slice(0, 5),
    };
  }

  // If topSegments.size === 1: All entries share a single top folder!
  const singleTop = Array.from(topSegments)[0];
  const wrapperPrefix = singleTop + '/';

  // Check what is inside this single wrapper
  const innerPaths = cleanPaths
    .filter((p) => p.startsWith(wrapperPrefix) && p !== wrapperPrefix)
    .map((p) => p.slice(wrapperPrefix.length));

  if (innerPaths.length === 0) {
    return {
      detectedRoot: '',
      hasWrapperFolder: false,
      reason: `Archive only contains a single empty folder "${singleTop}".`,
      allEntriesShareRoot: true,
      sampleIndicatorFiles: [],
    };
  }

  // Check if inner folder has project indicators
  const indicatorsInWrapper = innerPaths.filter((p) =>
    PROJECT_ROOT_INDICATORS.some((ind) =>
      ind.endsWith('/') ? p.startsWith(ind) : p === ind
    )
  );

  const hasIndicators = indicatorsInWrapper.length > 0;
  const isWrapperLikeName =
    singleTop.endsWith('-master') ||
    singleTop.endsWith('-main') ||
    singleTop.endsWith('-source') ||
    singleTop.includes('source') ||
    singleTop.includes('export');

  return {
    detectedRoot: wrapperPrefix,
    hasWrapperFolder: true,
    reason: hasIndicators
      ? `All ${cleanPaths.length} entries are contained inside "${singleTop}/", which contains project files (${indicatorsInWrapper.slice(0, 3).join(', ')}). Stripping this wrapper will place project files directly at the repository root.`
      : isWrapperLikeName
      ? `All entries are wrapped inside container folder "${singleTop}/".`
      : `All entries are wrapped inside a single top-level folder "${singleTop}/".`,
    allEntriesShareRoot: true,
    sampleIndicatorFiles: indicatorsInWrapper.slice(0, 5),
  };
}

export function computeRepoPaths(
  entries: ArchiveEntry[],
  stripWrapper: boolean,
  detectedWrapper: string
): ArchiveEntry[] {
  const prefix = detectedWrapper.endsWith('/') ? detectedWrapper : detectedWrapper + '/';

  return entries.map((entry) => {
    let repoPath = entry.normalizedPath;

    if (stripWrapper && prefix && entry.normalizedPath.startsWith(prefix)) {
      repoPath = entry.normalizedPath.slice(prefix.length);
    }

    return {
      ...entry,
      repoPath,
    };
  });
}
