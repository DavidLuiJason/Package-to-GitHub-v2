import { ArchiveEntry } from '../../types/archive';
import { RepoVerificationResult } from '../../types/github';
import { GitHubClient } from '../github/githubClient';

export async function verifyPublishedRepo(
  client: GitHubClient,
  owner: string,
  repo: string,
  commitSha: string,
  treeSha: string,
  expectedFiles: ArchiveEntry[],
  defaultBranch = 'main'
): Promise<RepoVerificationResult> {
  // 1. Fetch recursive tree from GitHub
  const treeResponse = await client.getRecursiveTree(owner, repo, treeSha);
  const actualItems = treeResponse.tree || [];

  // Filter to only blobs (files)
  const actualBlobPaths = new Set(
    actualItems
      .filter((item) => item.type === 'blob')
      .map((item) => item.path)
  );

  const expectedPaths = expectedFiles.map((f) => f.repoPath);
  const expectedPathSet = new Set(expectedPaths);

  const missingFiles: string[] = [];
  const extraFiles: string[] = [];
  let matchedFilesCount = 0;

  for (const exp of expectedPaths) {
    if (actualBlobPaths.has(exp)) {
      matchedFilesCount++;
    } else {
      missingFiles.push(exp);
    }
  }

  for (const act of Array.from(actualBlobPaths)) {
    if (!expectedPathSet.has(act)) {
      extraFiles.push(act);
    }
  }

  // 2. Verify commit exists
  const commit = await client.getCommit(owner, repo, commitSha);
  if (!commit || !commit.sha) {
    throw new Error(`Commit verification failed: Commit ${commitSha} could not be confirmed on GitHub.`);
  }

  const isVerified = missingFiles.length === 0 && actualBlobPaths.size === expectedPaths.length;

  return {
    isVerified,
    expectedFilesCount: expectedPaths.length,
    actualFilesCount: actualBlobPaths.size,
    matchedFilesCount,
    missingFiles,
    extraFiles,
    commitSha,
    treeSha,
    verifiedAt: new Date().toISOString(),
    repoUrl: `https://github.com/${owner}/${repo}`,
    defaultBranch,
  };
}
