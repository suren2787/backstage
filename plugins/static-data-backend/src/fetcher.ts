// Recursively list all OpenAPI files in contracts/{bounded-context}/openapi/{api}/{version}.yaml
export async function fetchAllOpenApiDefinitionsFromContracts(github: GitHubConfig, contractsPath = 'contracts'): Promise<Array<{
  boundedContext: string;
  api: string;
  version: string;
  filePath: string;
  rawYaml: string;
}>> {
  const [owner, repo] = github.repo.split('/');
  const octokit = new Octokit({ auth: github.token });
  const results: Array<{boundedContext: string; api: string; version: string; filePath: string; rawYaml: string;}> = [];

  // List bounded contexts
  const bcs = await octokit.repos.getContent({ owner, repo, path: contractsPath, ref: github.branch ?? 'main' });
  if (!Array.isArray(bcs.data)) return results;
  for (const bc of bcs.data) {
    if (bc.type !== 'dir') continue;
    const bcName = bc.name;
    // List openapi folder
    let openapiDir;
    try {
      openapiDir = await octokit.repos.getContent({ owner, repo, path: `${contractsPath}/${bcName}/openapi`, ref: github.branch ?? 'main' });
    } catch { continue; }
    if (!Array.isArray(openapiDir.data)) continue;
    for (const apiDir of openapiDir.data) {
      if (apiDir.type !== 'dir') continue;
      const apiName = apiDir.name;
      // List versioned yaml files
      let versions;
      try {
        versions = await octokit.repos.getContent({ owner, repo, path: `${contractsPath}/${bcName}/openapi/${apiName}`, ref: github.branch ?? 'main' });
      } catch { continue; }
      if (!Array.isArray(versions.data)) continue;
      for (const vfile of versions.data) {
        if (vfile.type !== 'file' || !vfile.name.match(/^v[0-9]+\.ya?ml$/)) continue;
        const version = vfile.name.replace(/\.ya?ml$/, '');
        const filePath = `${contractsPath}/${bcName}/openapi/${apiName}/${vfile.name}`;
        const fileRes = await octokit.repos.getContent({ owner, repo, path: filePath, ref: github.branch ?? 'main' });
        // @ts-ignore
        const rawYaml = Buffer.from(fileRes.data.content, 'base64').toString('utf8');
        results.push({ boundedContext: bcName, api: apiName, version, filePath, rawYaml });
      }
    }
  }
  return results;
}
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
