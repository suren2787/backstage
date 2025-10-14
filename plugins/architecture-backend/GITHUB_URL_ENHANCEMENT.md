# GitHub URL Extraction Enhancement

## Overview

Enhanced the `extractGitHubUrl()` function in the architecture plugin to properly parse GitHub URLs from multiple annotation formats and extract structured repository information.

## Changes Made

### 1. Enhanced `extractGitHubUrl()` Method

Now handles multiple annotation formats:

**Format 1: `github.com/project-slug`**
```yaml
metadata:
  annotations:
    github.com/project-slug: "owner/repo"
```
Result: `https://github.com/owner/repo`

**Format 2: `backstage.io/source-location` with `url:` prefix**
```yaml
metadata:
  annotations:
    backstage.io/source-location: "url:https://github.com/owner/repo"
```
Result: `https://github.com/owner/repo`

**Format 3: `backstage.io/source-location` with `github:` prefix**
```yaml
metadata:
  annotations:
    backstage.io/source-location: "github:https://github.com/owner/repo"
```
Result: `https://github.com/owner/repo`

**Format 4: Direct URL without prefix**
```yaml
metadata:
  annotations:
    backstage.io/source-location: "https://github.com/owner/repo"
```
Result: `https://github.com/owner/repo`

### 2. New `parseGitHubUrl()` Method

Extracts structured repository information from GitHub URLs:

**Input:** `https://github.com/suren2787/payment-gateway`

**Output:**
```typescript
{
  org: "suren2787",
  repo: "payment-gateway"
}
```

**Input:** `https://github.com/suren2787/payment-gateway/tree/main/src/api`

**Output:**
```typescript
{
  org: "suren2787",
  repo: "payment-gateway",
  path: "src/api"
}
```

### 3. Updated `ComponentReference` Type

Added structured GitHub fields:

```typescript
export interface ComponentReference {
  name: string;
  entityRef: string;
  type: string;
  githubUrl?: string;
  // NEW: Structured GitHub repository information
  githubOrg?: string;      // GitHub organization/owner
  githubRepo?: string;     // Repository name  
  githubPath?: string;     // Path within repository (if specified)
}
```

## API Response Examples

### Before Enhancement
```json
{
  "name": "payment-validator",
  "entityRef": "component:default/payment-validator",
  "type": "service",
  "githubUrl": "https"
}
```

### After Enhancement
```json
{
  "name": "payment-validator",
  "entityRef": "component:default/payment-validator",
  "type": "service",
  "githubUrl": "https://github.com/suren2787/payment-validator",
  "githubOrg": "suren2787",
  "githubRepo": "payment-validator"
}
```

## Testing Results

✅ **All components now have proper GitHub URLs extracted:**

```bash
curl http://localhost:7007/api/architecture/contexts/card-issuing | jq '.context.components'
```

**Result:**
```json
[
  {
    "name": "card-issuer",
    "entityRef": "component:default/card-issuer",
    "type": "service",
    "githubUrl": "https://github.com/suren2787/card-issuer",
    "githubOrg": "suren2787",
    "githubRepo": "card-issuer"
  },
  {
    "name": "card-activation",
    "entityRef": "component:default/card-activation",
    "type": "service",
    "githubUrl": "https://github.com/suren2787/card-activation",
    "githubOrg": "suren2787",
    "githubRepo": "card-activation"
  }
]
```

## Benefits

1. **Multiple Format Support:** Works with all common GitHub annotation formats used in Backstage
2. **Structured Data:** Provides parsed org/repo/path for easier consumption by frontend
3. **Backwards Compatible:** Still provides full `githubUrl` string
4. **Flexible:** Handles URLs with/without `.git` extension, query parameters, anchors
5. **Path Support:** Can extract paths for monorepo scenarios (e.g., `/tree/main/services/payment-api`)

## Use Cases

### Frontend Visualization
- Direct links to repository home page
- Deep links to specific paths (monorepo support)
- Organization-level grouping/filtering

### Repository Analysis (Future)
- Clone repositories using structured info
- Fetch `application.yml` or other config files
- Analyze monorepo structure

### Integration with GitHub API
- Easy to construct API URLs: `https://api.github.com/repos/{org}/{repo}`
- Check repository metadata, branches, contributors
- Fetch README, dependencies, etc.

## Implementation Details

### Regex Pattern Explanation

```typescript
/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?(?:$|[?#/])/
```

- `github\.com[/:]` - Matches "github.com/" or "github.com:"
- `([^/]+\/[^/]+?)` - Captures "org/repo" (non-greedy)
- `(?:\.git)?` - Optional ".git" extension
- `(?:$|[?#/])` - Ends with string end, query, anchor, or path separator

This handles:
- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `https://github.com/owner/repo?tab=readme`
- `https://github.com/owner/repo#installation`
- `https://github.com/owner/repo/tree/main/src`
- `git@github.com:owner/repo.git` (SSH format)

## Next Steps

1. ✅ Enhanced GitHub URL extraction - **COMPLETE**
2. Use structured GitHub info in frontend visualization
3. Implement repository analysis (Phase 5):
   - Clone repos and parse `application.yml`
   - Detect shared databases
   - Analyze Kafka topics
   - Find shared libraries

## Related Files

- `plugins/architecture-backend/src/module.ts` - Implementation
- `plugins/architecture-backend/src/types.ts` - Type definitions
- `plugins/architecture-backend/TEST_RESULTS.md` - Test results

## Commit

```bash
git commit -m "feat(architecture): enhance GitHub URL extraction with structured parsing

- Support multiple annotation formats: github.com/project-slug, backstage.io/source-location
- Handle url: and github: prefixes in source-location annotations
- Extract structured repo info: githubOrg, githubRepo, githubPath
- Add parseGitHubUrl() helper for repository structure extraction
- Support monorepo paths and various URL formats (.git, query params, anchors)
- Updated ComponentReference type with new optional fields
- Backwards compatible - still returns full githubUrl string

Tested with real catalog data - all components now show proper GitHub URLs"
```
