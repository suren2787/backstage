# GitHub Enterprise Configuration for Static Data Backend Plugin

**Date:** November 14, 2025  
**Version:** 1.0  
**Purpose:** Enable static-data-backend plugin to fetch files from GitHub Enterprise instance

---

## 📋 Problem Statement

The `static-data-backend` plugin currently fetches gradle files and other repository data using:
- **public.github.com API** via `@octokit/rest` library
- **raw.githubusercontent.com** for raw file content

For **GitHub Enterprise**, you need to:
1. Configure plugin to use your enterprise GitHub instance (e.g., `github.company.com`)
2. Use enterprise raw content URLs instead of public GitHub
3. Update authentication to use enterprise tokens

---

## 🔧 Solution

### Option 1: Update Octokit Configuration for Enterprise (RECOMMENDED)

Update the `fetchFileFromGitHub` function in `plugins/static-data-backend/src/fetcher.ts`:

```typescript
import { Octokit } from '@octokit/rest';

export type GitHubConfig = {
  repo: string;              // owner/repo
  branch?: string;
  token?: string;
  enterprise?: {
    host: string;            // github.company.com
    apiUrl?: string;         // https://github.company.com/api/v3 (default)
  };
};

export async function fetchFileFromGitHub(github: GitHubConfig, path: string): Promise<string> {
  const [owner, repo] = github.repo.split('/');
  
  // Configure Octokit for enterprise or public GitHub
  const octokitOptions: any = {
    auth: github.token,
  };
  
  if (github.enterprise) {
    // GitHub Enterprise configuration
    octokitOptions.baseUrl = github.enterprise.apiUrl || `https://${github.enterprise.host}/api/v3`;
  }
  
  const octokit = new Octokit(octokitOptions);

  try {
    const res = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: github.branch ?? 'main',
    });
    
    // @ts-ignore
    return Array.isArray(res.data) ? '' : Buffer.from(res.data.content, 'base64').toString('utf8');
  } catch (error: any) {
    throw new Error(
      `Failed to fetch ${owner}/${repo}/${path} from ${
        github.enterprise ? `${github.enterprise.host}` : 'github.com'
      } (ref: ${github.branch ?? 'main'}): ${error.message || error}`
    );
  }
}

// Update fetchAllOpenApiDefinitionsFromContracts similarly
export async function fetchAllOpenApiDefinitionsFromContracts(
  github: GitHubConfig,
  contractsPath = 'contracts'
): Promise<Array<{
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
    octokitOptions.baseUrl = github.enterprise.apiUrl || `https://${github.enterprise.host}/api/v3`;
  }
  
  const octokit = new Octokit(octokitOptions);
  const results: Array<{
    boundedContext: string;
    api: string;
    version: string;
    filePath: string;
    rawYaml: string;
  }> = [];

  try {
    // List bounded contexts
    const bcs = await octokit.repos.getContent({
      owner,
      repo,
      path: contractsPath,
      ref: github.branch ?? 'main',
    });
    
    if (!Array.isArray(bcs.data)) return results;
    
    for (const bc of bcs.data) {
      if (bc.type !== 'dir') continue;
      const bcName = bc.name;
      
      try {
        const openapiDir = await octokit.repos.getContent({
          owner,
          repo,
          path: `${contractsPath}/${bcName}/openapi`,
          ref: github.branch ?? 'main',
        });
        
        if (!Array.isArray(openapiDir.data)) continue;
        
        for (const apiDir of openapiDir.data) {
          if (apiDir.type !== 'dir') continue;
          const apiName = apiDir.name;
          
          try {
            const versions = await octokit.repos.getContent({
              owner,
              repo,
              path: `${contractsPath}/${bcName}/openapi/${apiName}`,
              ref: github.branch ?? 'main',
            });
            
            if (!Array.isArray(versions.data)) continue;
            
            for (const vfile of versions.data) {
              if (vfile.type !== 'file' || !vfile.name.match(/^v[0-9]+\.ya?ml$/)) continue;
              
              const version = vfile.name.replace(/\.ya?ml$/, '');
              const filePath = `${contractsPath}/${bcName}/openapi/${apiName}/${vfile.name}`;
              
              const fileRes = await octokit.repos.getContent({
                owner,
                repo,
                path: filePath,
                ref: github.branch ?? 'main',
              });
              
              // @ts-ignore
              const rawYaml = Buffer.from(fileRes.data.content, 'base64').toString('utf8');
              results.push({ boundedContext: bcName, api: apiName, version, filePath, rawYaml });
            }
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }
  } catch (error: any) {
    console.error('Failed to fetch OpenAPI definitions from contracts:', error);
  }
  
  return results;
}
```

---

### Option 2: Use Raw GitHub URLs (Alternative)

For fetching raw file content directly from GitHub Enterprise without API:

```typescript
export async function fetchFileFromGitHubRaw(
  github: GitHubConfig,
  path: string
): Promise<string> {
  const [owner, repo] = github.repo.split('/');
  const branch = github.branch ?? 'main';
  
  let url: string;
  
  if (github.enterprise) {
    // GitHub Enterprise raw URL format
    url = `https://${github.enterprise.host}/raw/${owner}/${repo}/${branch}/${path}`;
  } else {
    // Public GitHub raw URL format
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
      throw new Error(
        `HTTP ${response.status}: ${response.statusText} - ${url}`
      );
    }
    
    return await response.text();
  } catch (error: any) {
    throw new Error(
      `Failed to fetch ${url}: ${error.message || error}`
    );
  }
}
```

---

## 📝 Configuration Update

### In `app-config.yaml`:

```yaml
staticData:
  github:
    repo: owner/repo                    # Your static-data repo
    branch: master
    token: ${STATIC_DATA_GITHUB_TOKEN}
    
    # Add enterprise configuration
    enterprise:
      host: github.company.com          # Your GitHub Enterprise host
      # Optional: specify custom API endpoint
      # apiUrl: https://github.company.com/api/v3

  files:
    squads: 'data/squads.json'
    domains: 'data/domains.json'
    applications: 'data/applications.json'
    apis: 'data/apis.json'
```

### In `.env`:

```bash
# Existing configuration
STATIC_DATA_GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
STATIC_DATA_REPO=owner/repo
STATIC_DATA_BRANCH=master

# For GitHub Enterprise (optional - can hardcode in app-config.yaml)
# GITHUB_ENTERPRISE_HOST=github.company.com
```

---

## 🔑 Enterprise Token Configuration

### Generating GitHub Enterprise Personal Access Token:

1. **Login to GitHub Enterprise** at `https://github.company.com`
2. Navigate to **Settings → Developer settings → Personal access tokens**
3. Click **Generate new token** (classic)
4. **Scopes needed**:
   ```
   ✓ repo         (Full control of private repositories)
   ✓ read:org     (Read access to organizations)
   ```
5. Copy token and store in `.env`:
   ```bash
   STATIC_DATA_GITHUB_TOKEN=ghp_xxxxx
   ```

### Or use GitHub Enterprise Token (no expiration):

1. Go to **Settings → Developer settings → Personal access tokens → Tokens (beta)**
2. Click **Generate new token**
3. **Scopes needed**:
   ```
   ✓ repo (read)
   ✓ admin:repo_hook (optional - for webhooks)
   ```
4. Store token in `.env`

---

## 🧪 Testing Connection

### Test 1: Verify token works

```bash
#!/bin/bash
GITHUB_HOST="github.company.com"
GITHUB_TOKEN="ghp_xxxxx"
OWNER="your-org"
REPO="static-data"

# Test with curl
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://$GITHUB_HOST/api/v3/repos/$OWNER/$REPO" | jq '.name'
```

### Test 2: Fetch raw file

```bash
#!/bin/bash
GITHUB_HOST="github.company.com"
GITHUB_TOKEN="ghp_xxxxx"
OWNER="your-org"
REPO="static-data"
BRANCH="master"

# Test fetching raw file
curl -H "Authorization: token $GITHUB_TOKEN" \
  "https://$GITHUB_HOST/raw/$OWNER/$REPO/$BRANCH/data/squads.json" | jq '.'
```

### Test 3: Test Octokit configuration

```typescript
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  baseUrl: 'https://github.company.com/api/v3',
  auth: 'ghp_xxxxx'
});

octokit.repos.getContent({
  owner: 'your-org',
  repo: 'static-data',
  path: 'data/squads.json'
}).then(res => {
  console.log('✅ Connection successful');
  console.log(Buffer.from(res.data.content, 'base64').toString('utf8'));
});
```

---

## 📦 Implementation Steps

### Step 1: Update fetcher.ts

```bash
# Backup original file
cp plugins/static-data-backend/src/fetcher.ts plugins/static-data-backend/src/fetcher.ts.backup

# Replace with new version (see code above)
```

### Step 2: Update module.ts to pass enterprise config

**File:** `plugins/static-data-backend/src/module.ts`

```typescript
// Update the module initialization
export const staticDataBackendPlugin = createBackendModule({
  pluginId: 'static-data-backend',
  register(env) {
    env.registerInit({
      deps: { config: coreServices.rootConfig },
      async init({ config }) {
        // Get enterprise configuration
        const enterprise = config.getOptionalConfig('staticData.github.enterprise');
        const githubConfig = {
          repo: config.getString('staticData.github.repo'),
          branch: config.getOptionalString('staticData.github.branch'),
          token: config.getOptionalString('staticData.github.token'),
          enterprise: enterprise ? {
            host: enterprise.getString('host'),
            apiUrl: enterprise.getOptionalString('apiUrl'),
          } : undefined,
        };
        
        // ... rest of initialization
      }
    });
  }
});
```

### Step 3: Update app-config.yaml

Add enterprise configuration section (see above).

### Step 4: Test

```bash
# Start Backstage
yarn dev

# Check logs for successful connection
tail -f logs/backstage.log | grep -i github
```

---

## 🚨 Troubleshooting

### Issue: "GitHub API error: 404 Not Found"

**Cause:** Using wrong API endpoint  
**Solution:**
```yaml
# Make sure you have the correct host
enterprise:
  host: github.company.com          # No https:// prefix!
  apiUrl: https://github.company.com/api/v3  # Full URL with /api/v3
```

### Issue: "401 Unauthorized"

**Cause:** Invalid or expired token  
**Solution:**
1. Verify token in `.env`: `STATIC_DATA_GITHUB_TOKEN=ghp_xxxxx`
2. Test token manually:
   ```bash
   curl -H "Authorization: token ghp_xxxxx" \
     https://github.company.com/api/v3/user
   ```
3. Regenerate token if expired

### Issue: "Repository not found"

**Cause:** Token doesn't have access to repo  
**Solution:**
1. Verify token has `repo` scope
2. Verify organization access:
   ```bash
   curl -H "Authorization: token ghp_xxxxx" \
     https://github.company.com/api/v3/repos/your-org/static-data
   ```
3. Check if repo is private and token has access

### Issue: "Raw content 404"

**Cause:** Wrong raw URL format for enterprise  
**Solution:**
```bash
# Correct enterprise format
https://github.company.com/raw/owner/repo/branch/path/to/file

# NOT
https://raw.githubusercontent.com/...
```

---

## 🔍 Enterprise vs Public GitHub URLs

| Endpoint | Public GitHub | GitHub Enterprise |
|----------|---------------|-------------------|
| **API Base** | `https://api.github.com` | `https://github.company.com/api/v3` |
| **Raw Content** | `https://raw.githubusercontent.com/...` | `https://github.company.com/raw/...` |
| **Octokit Config** | `new Octokit({ auth: token })` | `new Octokit({ baseUrl: 'https://...', auth: token })` |

---

## ✅ Verification Checklist

- [ ] Token has `repo` scope
- [ ] Enterprise host is correct (no `https://` prefix in config)
- [ ] API URL is set to `https://host/api/v3`
- [ ] Token can read target repository
- [ ] `.env` file has token set
- [ ] `app-config.yaml` has enterprise section
- [ ] `fetcher.ts` updated with enterprise support
- [ ] Plugin rebuilds without errors: `yarn build`
- [ ] Backstage starts: `yarn dev`
- [ ] Logs show successful GitHub connection

---

## 📚 References

- [Octokit Enterprise Configuration](https://github.com/octokit/rest.js#in-nodejs)
- [GitHub Enterprise API Documentation](https://docs.github.com/en/enterprise-server@latest/rest)
- [Backstage Plugin Development](https://backstage.io/docs/plugins/overview)
- [Personal Access Tokens](https://docs.github.com/en/enterprise-server@latest/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

---

**Created:** November 14, 2025  
**Status:** Ready for Implementation
