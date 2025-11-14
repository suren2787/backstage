import * as gradleParser from 'gradle-to-js/lib/parser';

// GitHub Enterprise configuration
export type GitHubConfig = {
  repo: string;              // owner/repo
  branch?: string;
  token?: string;
  enterprise?: {
    host: string;            // github.company.com (without https://)
    apiUrl?: string;         // https://github.company.com/api/v3 (optional, auto-generated if not provided)
  };
};

// Fetch and parse build.gradle from a remote GitHub repo
// Will try the specified branch first, then fallback to 'main', then 'master'
// Returns both the parsed object and the raw content for regex-based extraction
export async function fetchAndParseBuildGradle(github: GitHubConfig, repo: string, branch: string = 'main', path: string = 'build.gradle'): Promise<{ parsed: any; rawContent: string }> {
  const branchesToTry = [branch, 'main', 'master'].filter((b, i, arr) => arr.indexOf(b) === i); // dedupe
  
  let lastError: any;
  for (const tryBranch of branchesToTry) {
    try {
      const gradleGithubConfig = { ...github, repo, branch: tryBranch };
      const gradleContent = await fetchFileFromGitHub(gradleGithubConfig, path);
      // Use gradle-to-js to parse the build.gradle content
      try {
        const parsed = await gradleParser.parseText(gradleContent);
        return { parsed, rawContent: gradleContent };
      } catch (e) {
        throw new Error(`Failed to parse build.gradle for ${repo}: ${e}`);
      }
    } catch (e: any) {
      lastError = e;
      // Continue to next branch
      continue;
    }
  }
  
  // If all branches failed, throw the last error
  throw lastError;
}

// Extract openapi producer/consumer API references from build.gradle raw content
// Handles format like: javaspring("system:api:version") or java("system:api:version")
// Converts "system:api:version" to "system-api-vX" format for Backstage entity names
export function extractOpenApiRelations(gradleResult: { parsed: any; rawContent: string }): { produces: string[]; consumes: string[] } {
  const produces: string[] = [];
  const consumes: string[] = [];
  
  if (!gradleResult || !gradleResult.rawContent) return { produces, consumes };
  
  const rawContent = gradleResult.rawContent;
  
  // Helper function to convert API string to Backstage entity name
  // Input: "mf-platform:mutual-fund-api:1.0.0" or similar
  // Output: "mf-platform-mutual-fund-api-v1"
  const toBackstageApiName = (apiString: string): string | null => {
    if (!apiString) return null;
    
    // Match pattern: "system:api:version"
    const match = apiString.match(/^([^:]+):([^:]+):([^:]+)$/);
    if (!match) return null;
    
    const [, system, api, version] = match;
    // Convert to Backstage entity name format: system-api-vX
    const versionPart = version.startsWith('v') ? version : `v${version.split('.')[0]}`;
    return `${system}-${api}-${versionPart}`;
  };
  
  // Extract producer APIs using regex
  // Match patterns like: javaspring("mf-platform:mutual-fund-api:1.0.0") or java("...")
  // Look within openapi { producer { ... } } blocks
  const producerRegex = /producer\s*\{[\s\S]*?\}/gi;
  const producerMatch = rawContent.match(producerRegex);
  
  if (producerMatch) {
    for (const producerBlock of producerMatch) {
      // Extract all quoted strings that look like "system:api:version"
      const apiRegex = /["']([^"']+:[^"']+:[^"']+)["']/g;
      let match;
      while ((match = apiRegex.exec(producerBlock)) !== null) {
        const apiName = toBackstageApiName(match[1]);
        if (apiName && !produces.includes(apiName)) {
          produces.push(apiName);
        }
      }
    }
  }
  
  // Extract consumer APIs using regex
  const consumerRegex = /consumer\s*\{[\s\S]*?\}/gi;
  const consumerMatch = rawContent.match(consumerRegex);
  
  if (consumerMatch) {
    for (const consumerBlock of consumerMatch) {
      // Extract all quoted strings that look like "system:api:version"
      const apiRegex = /["']([^"']+:[^"']+:[^"']+)["']/g;
      let match;
      while ((match = apiRegex.exec(consumerBlock)) !== null) {
        const apiName = toBackstageApiName(match[1]);
        if (apiName && !consumes.includes(apiName)) {
          consumes.push(apiName);
        }
      }
    }
  }
  
  return { produces, consumes };
}
// Recursively list all OpenAPI files in contracts/{bounded-context}/openapi/{api}/{version}.yaml
export async function fetchAllOpenApiDefinitionsFromContracts(github: GitHubConfig, contractsPath = 'contracts'): Promise<Array<{
  boundedContext: string;
  api: string;
  version: string;
  filePath: string;
  rawYaml: string;
}>> {
  const [owner, repo] = github.repo.split('/');
  
  // Configure Octokit for enterprise or public GitHub
  const octokitOptions: any = {
    auth: github.token,
  };
  
  if (github.enterprise) {
    const apiUrl = github.enterprise.apiUrl || `https://${github.enterprise.host}/api/v3`;
    octokitOptions.baseUrl = apiUrl;
  }
  
  const octokit = new Octokit(octokitOptions);
  const results: Array<{boundedContext: string; api: string; version: string; filePath: string; rawYaml: string;}> = [];

  try {
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
  } catch (error: any) {
    const host = github.enterprise ? github.enterprise.host : 'github.com';
    console.error(`Failed to fetch OpenAPI definitions from ${host}:`, error);
  }
  
  return results;
}

import { Octokit } from '@octokit/rest';

export async function fetchFileFromGitHub(github: GitHubConfig, path: string): Promise<string> {
  const [owner, repo] = github.repo.split('/');
  
  // Configure Octokit for enterprise or public GitHub
  const octokitOptions: any = {
    auth: github.token,
  };
  
  if (github.enterprise) {
    // GitHub Enterprise configuration
    const apiUrl = github.enterprise.apiUrl || `https://${github.enterprise.host}/api/v3`;
    octokitOptions.baseUrl = apiUrl;
  }
  
  const octokit = new Octokit(octokitOptions);

  try {
    const res = await octokit.repos.getContent({ owner, repo, path, ref: github.branch ?? 'main' });
    // @ts-ignore
    return Array.isArray(res.data) ? '' : Buffer.from(res.data.content, 'base64').toString('utf8');
  } catch (error: any) {
    const host = github.enterprise ? github.enterprise.host : 'github.com';
    throw new Error(`Failed to fetch ${owner}/${repo}/${path} from ${host} (ref: ${github.branch ?? 'main'}): ${error.message || error}`);
  }
}
