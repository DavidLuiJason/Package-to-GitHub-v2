import { GitHubRepo, GitHubTreeItem, GitHubUser } from '../../types/github';

export interface GitHubApiError {
  status: number;
  message: string;
  documentationUrl?: string;
  raw?: any;
}

export class GitHubClient {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    this.token = token.trim();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3,
    backoffMs = 1000
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Check for rate limit or secondary rate limit
      if (response.status === 403 || response.status === 429) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const resetTime = response.headers.get('x-ratelimit-reset');
        const errorData = await response.json().catch(() => ({}));

        if (remaining === '0' && resetTime) {
          const resetDate = new Date(parseInt(resetTime, 10) * 1000);
          throw {
            status: 403,
            message: `GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}.`,
            raw: errorData,
          } as GitHubApiError;
        }

        // Secondary rate limit retry
        if (retries > 0 && (errorData.message?.includes('secondary rate limit') || response.status === 429)) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoffMs * 2;
          await new Promise((r) => setTimeout(r, delay));
          return this.request<T>(endpoint, options, retries - 1, backoffMs * 2);
        }

        throw {
          status: response.status,
          message: errorData.message || 'Access forbidden or rate limit reached on GitHub.',
          raw: errorData,
        } as GitHubApiError;
      }

      // Transient server error retry
      if ([500, 502, 503, 504].includes(response.status) && retries > 0) {
        await new Promise((r) => setTimeout(r, backoffMs));
        return this.request<T>(endpoint, options, retries - 1, backoffMs * 2);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let message = errorData.message || `GitHub API request failed with status ${response.status}`;

        if (response.status === 401) {
          message = 'Invalid or expired GitHub access token. Please check your token and scopes.';
        } else if (response.status === 404) {
          message = errorData.message || 'Resource not found on GitHub.';
        } else if (response.status === 422) {
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const errorDetails = errorData.errors.map((e: any) => e.message || e.code).join(', ');
            message = `${errorData.message}: ${errorDetails}`;
          }
        }

        throw {
          status: response.status,
          message,
          documentationUrl: errorData.documentation_url,
          raw: errorData,
        } as GitHubApiError;
      }

      // Return null on 204 No Content
      if (response.status === 204) {
        return null as unknown as T;
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err.status) {
        throw err;
      }
      // Network failure retry
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, backoffMs));
        return this.request<T>(endpoint, options, retries - 1, backoffMs * 2);
      }
      throw {
        status: 0,
        message: err.message || 'Network connection to GitHub failed.',
        raw: err,
      } as GitHubApiError;
    }
  }

  /**
   * Authenticates and returns the current user profile.
   */
  public async getAuthenticatedUser(): Promise<GitHubUser> {
    return this.request<GitHubUser>('/user');
  }

  /**
   * Checks current rate limits.
   */
  public async getRateLimit(): Promise<{ limit: number; remaining: number; reset: number }> {
    const res = await this.request<any>('/rate_limit');
    return res.resources?.core || { limit: 5000, remaining: 5000, reset: 0 };
  }

  /**
   * Checks if a repository already exists for the given owner.
   */
  public async repoExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.request<GitHubRepo>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
      return true;
    } catch (err: any) {
      if (err.status === 404) {
        return false;
      }
      throw err;
    }
  }

  /**
   * Creates a brand new repository initialized with a default commit to activate the Git DB.
   */
  public async createRepository(
    name: string,
    description: string,
    isPrivate: boolean
  ): Promise<GitHubRepo> {
    return this.request<GitHubRepo>('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: description || undefined,
        private: isPrivate,
        auto_init: true, // Required so GitHub initializes the Git object database
      }),
    });
  }

  /**
   * Initializes an empty repository by creating an initial .gitkeep file via contents API.
   * This is used as a fallback if the repository was created without an initial commit.
   */
  public async initializeEmptyRepo(
    owner: string,
    repo: string,
    branchName = 'main'
  ): Promise<string> {
    try {
      const res = await this.request<any>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/.gitkeep`,
        {
          method: 'PUT',
          body: JSON.stringify({
            message: 'Initialize repository via Pack2Git',
            content: 'Cg==', // Base64 for "\n"
            branch: branchName,
          }),
        }
      );
      return res.commit?.sha || '';
    } catch {
      return '';
    }
  }

  /**
   * Waits for GitHub to finish initializing the Git object database and returns the initial commit SHA.
   */
  public async waitForRepoInitialized(
    owner: string,
    repo: string,
    branchName = 'main',
    maxAttempts = 15,
    delayMs = 600
  ): Promise<string | undefined> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const ref = await this.request<any>(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branchName)}`
        );
        if (ref?.object?.sha) {
          return ref.object.sha;
        }
      } catch {
        // Also check if commits exist
        try {
          const commits = await this.request<any[]>(
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=1`
          );
          if (Array.isArray(commits) && commits.length > 0 && commits[0]?.sha) {
            return commits[0].sha;
          }
        } catch {
          // not ready yet
        }
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // If still not ready after polling, force initialize via contents endpoint
    const fallbackSha = await this.initializeEmptyRepo(owner, repo, branchName);
    if (fallbackSha) {
      await new Promise((r) => setTimeout(r, 800));
      return fallbackSha;
    }
    return undefined;
  }

  /**
   * Deletes a repository (used for rollback if requested by user).
   */
  public async deleteRepository(owner: string, repo: string): Promise<void> {
    await this.request<void>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Creates a Git Blob from Base64 content with 409 empty repo self-healing recovery.
   */
  public async createBlob(
    owner: string,
    repo: string,
    contentBase64: string,
    defaultBranch = 'main'
  ): Promise<{ sha: string; url: string }> {
    try {
      return await this.request<{ sha: string; url: string }>(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: contentBase64,
            encoding: 'base64',
          }),
        }
      );
    } catch (err: any) {
      // 409 Conflict: "Git Repository is empty."
      if (err.status === 409 && (err.message?.includes('empty') || err.raw?.message?.includes('empty'))) {
        // Initialize the repository git database and retry
        await this.initializeEmptyRepo(owner, repo, defaultBranch);
        await new Promise((r) => setTimeout(r, 1000));
        return await this.request<{ sha: string; url: string }>(
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs`,
          {
            method: 'POST',
            body: JSON.stringify({
              content: contentBase64,
              encoding: 'base64',
            }),
          }
        );
      }
      throw err;
    }
  }

  /**
   * Creates a Git Tree containing blobs.
   */
  public async createTree(
    owner: string,
    repo: string,
    treeItems: Array<{
      path: string;
      mode: '100644' | '100755';
      type: 'blob';
      sha: string;
    }>
  ): Promise<{ sha: string; tree: GitHubTreeItem[] }> {
    return this.request<{ sha: string; tree: GitHubTreeItem[] }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees`,
      {
        method: 'POST',
        body: JSON.stringify({
          tree: treeItems,
        }),
      }
    );
  }

  /**
   * Creates a Git Commit pointing to a Tree.
   */
  public async createCommit(
    owner: string,
    repo: string,
    message: string,
    treeSha: string,
    parents: string[] = []
  ): Promise<{ sha: string; html_url?: string }> {
    return this.request<{ sha: string; html_url?: string }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/commits`,
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: treeSha,
          parents,
        }),
      }
    );
  }

  /**
   * Creates or updates a Git Reference (branch), e.g. refs/heads/main
   */
  public async setBranchRef(
    owner: string,
    repo: string,
    branchName = 'main',
    commitSha: string
  ): Promise<void> {
    const refPath = `refs/heads/${branchName}`;

    // Check if the ref already exists
    let refExists = false;
    try {
      await this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(branchName)}`);
      refExists = true;
    } catch (err: any) {
      if (err.status === 404) {
        refExists = false;
      }
    }

    if (refExists) {
      await this.request(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodeURIComponent(branchName)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            sha: commitSha,
            force: true,
          }),
        }
      );
    } else {
      await this.request(
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
        {
          method: 'POST',
          body: JSON.stringify({
            ref: refPath,
            sha: commitSha,
          }),
        }
      );
    }
  }

  /**
   * Fetches recursive tree for verification.
   */
  public async getRecursiveTree(
    owner: string,
    repo: string,
    treeSha: string
  ): Promise<{ sha: string; tree: GitHubTreeItem[]; truncated: boolean }> {
    return this.request<{ sha: string; tree: GitHubTreeItem[]; truncated: boolean }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`
    );
  }

  /**
   * Fetches commit details for verification.
   */
  public async getCommit(
    owner: string,
    repo: string,
    commitSha: string
  ): Promise<any> {
    return this.request<any>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(commitSha)}`
    );
  }
}
