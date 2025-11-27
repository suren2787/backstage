import * as gradleParser from 'gradle-to-js/lib/parser';

// GitHub configuration (supports public GitHub and Enterprise)
export type GitHubConfig = {
  repo: string;              // owner/repo
  branch?: string;
  token?: string;
  enterprise?: {
    host: string;            // github.company.com (without https://)
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
// Helper function to list directory contents via GitHub API
async function listGitHubDirectory(github: GitHubConfig, dirPath: string): Promise<any[]> {
  const [owner, repo] = github.repo.split('/');
  const branch = github.branch ?? 'main';
  
  let apiUrl: string;
  if (github.enterprise) {
    // GitHub Enterprise API: https://github.company.com/api/v3
    apiUrl = `https://${github.enterprise.host}/api/v3/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`;
  } else {
    // Public GitHub API
    apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`;
  }
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (github.token) {
    headers['Authorization'] = `token ${github.token}`;
  }

  try {
    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error: any) {
    const host = github.enterprise ? github.enterprise.host : 'github.com';
    throw new Error(`Failed to list ${host}/${owner}/${repo}/${dirPath}: ${error.message || error}`);
  }
}

// Recursively list all OpenAPI files in contracts/{bounded-context}/openapi/{api}/{version}.yaml
export async function fetchAllOpenApiDefinitionsFromContracts(github: GitHubConfig, contractsPath = 'contracts'): Promise<Array<{
  boundedContext: string;
  api: string;
  version: string;
  filePath: string;
  rawYaml: string;
}>> {
  const results: Array<{boundedContext: string; api: string; version: string; filePath: string; rawYaml: string;}> = [];

  try {
    // List bounded contexts
    const bcs = await listGitHubDirectory(github, contractsPath);
    if (!Array.isArray(bcs)) return results;
    
    for (const bc of bcs) {
      if (bc.type !== 'dir') continue;
      const bcName = bc.name;
      
      // List openapi folder
      let openapiDir: any[] = [];
      try {
        openapiDir = await listGitHubDirectory(github, `${contractsPath}/${bcName}/openapi`);
      } catch { continue; }
      if (!Array.isArray(openapiDir)) continue;
      
      for (const apiDir of openapiDir) {
        if (apiDir.type !== 'dir') continue;
        const apiName = apiDir.name;
        
        // List versioned yaml files
        let versions: any[] = [];
        try {
          versions = await listGitHubDirectory(github, `${contractsPath}/${bcName}/openapi/${apiName}`);
        } catch { continue; }
        if (!Array.isArray(versions)) continue;
        
        for (const vfile of versions) {
          if (vfile.type !== 'file' || !vfile.name.match(/^v[0-9]+\.ya?ml$/)) continue;
          const version = vfile.name.replace(/\.ya?ml$/, '');
          const filePath = `${contractsPath}/${bcName}/openapi/${apiName}/${vfile.name}`;
          
          try {
            const rawYaml = await fetchFileFromGitHub(github, filePath);
            results.push({ boundedContext: bcName, api: apiName, version, filePath, rawYaml });
          } catch (error: any) {
            console.warn(`Failed to fetch ${filePath}: ${error.message}`);
          }
        }
      }
    }
  } catch (error: any) {
    const host = github.enterprise ? github.enterprise.host : 'github.com';
    console.error(`Failed to fetch OpenAPI definitions from ${host}:`, error);
  }
  
  return results;
}

// Recursively list all Avro schema files in contracts/{bounded-context}/avro/*.avsc
export async function fetchAllAvroSchemasFromContracts(github: GitHubConfig, contractsPath = 'contracts'): Promise<Array<{
  boundedContext: string;
  schemaName: string;
  filePath: string;
  rawSchema: string;
  parsedSchema?: any;
}>> {
  const results: Array<{boundedContext: string; schemaName: string; filePath: string; rawSchema: string; parsedSchema?: any;}> = [];

  try {
    // List bounded contexts
    const bcs = await listGitHubDirectory(github, contractsPath);
    if (!Array.isArray(bcs)) return results;
    
    for (const bc of bcs) {
      if (bc.type !== 'dir') continue;
      const bcName = bc.name;
      
      // List avro folder
      let avroDir: any[] = [];
      try {
        avroDir = await listGitHubDirectory(github, `${contractsPath}/${bcName}/avro`);
      } catch { continue; }
      if (!Array.isArray(avroDir)) continue;
      
      for (const schemaFile of avroDir) {
        if (schemaFile.type !== 'file' || !schemaFile.name.match(/\.avsc$/)) continue;
        
        const schemaName = schemaFile.name.replace(/\.avsc$/, '');
        const filePath = `${contractsPath}/${bcName}/avro/${schemaFile.name}`;
        
        try {
          const rawSchema = await fetchFileFromGitHub(github, filePath);
          let parsedSchema: any;
          try {
            parsedSchema = JSON.parse(rawSchema);
          } catch (e) {
            console.warn(`Failed to parse Avro schema ${filePath}: ${e}`);
          }
          results.push({ boundedContext: bcName, schemaName, filePath, rawSchema, parsedSchema });
        } catch (error: any) {
          console.warn(`Failed to fetch ${filePath}: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    const host = github.enterprise ? github.enterprise.host : 'github.com';
    console.error(`Failed to fetch Avro schemas from ${host}:`, error);
  }
  
  return results;
}

export async function fetchFileFromGitHub(github: GitHubConfig, path: string): Promise<string> {
  const [owner, repo] = github.repo.split('/');
  const branch = github.branch ?? 'main';
  
  // Build raw content URL
  let url: string;
  if (github.enterprise) {
    // GitHub Enterprise raw URL: https://github.company.com/raw/owner/repo/branch/path
    url = `https://${github.enterprise.host}/raw/${owner}/${repo}/${branch}/${path}`;
  } else {
    // Public GitHub raw URL: https://raw.githubusercontent.com/owner/repo/branch/path
    url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }
  
  const headers: Record<string, string> = {
    'Accept': 'text/plain',
  };
  
  if (github.token) {
    headers['Authorization'] = `token ${github.token}`;
  }

  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error: any) {
    const host = github.enterprise ? github.enterprise.host : 'github.com';
    throw new Error(`Failed to fetch ${owner}/${repo}/${path} from ${host} (ref: ${branch}): ${error.message || error}`);
  }
}
