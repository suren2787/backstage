import { Octokit } from '@octokit/rest';

export type GitHubConfig = {
  repo: string; // owner/repo
  branch?: string;
  token?: string;
};

export async function fetchFileFromGitHub(github: GitHubConfig, path: string): Promise<string> {
  const [owner, repo] = github.repo.split('/');
  const octokit = new Octokit({ auth: github.token });

  try {
    const res = await octokit.repos.getContent({ owner, repo, path, ref: github.branch ?? 'main' });
    // @ts-ignore
    return Array.isArray(res.data) ? '' : Buffer.from(res.data.content, 'base64').toString('utf8');
  } catch (error: any) {
    throw new Error(`Failed to fetch ${owner}/${repo}/${path} (ref: ${github.branch ?? 'main'}): ${error.message || error}`);
  }
}
