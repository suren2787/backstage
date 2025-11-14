# Test GitHub Enterprise Connectivity

**Date:** November 14, 2025  
**Purpose:** Verify static-data-backend plugin can connect to GitHub Enterprise

---

## ✅ Pre-Deployment Checks

### 1. Verify Token Works

```bash
#!/bin/bash

# Set your GitHub Enterprise details
GITHUB_HOST="github.company.com"
GITHUB_TOKEN="${STATIC_DATA_GITHUB_TOKEN}"
OWNER="your-org"
REPO="static-data"

echo "🔍 Testing GitHub Enterprise Token..."
echo "Host: $GITHUB_HOST"
echo "Owner: $OWNER"
echo "Repo: $REPO"
echo ""

# Test API endpoint
API_URL="https://$GITHUB_HOST/api/v3/repos/$OWNER/$REPO"
echo "📡 Testing API endpoint: $API_URL"

RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "$API_URL" | jq -r '.name')

if [ "$RESPONSE" = "$REPO" ]; then
  echo "✅ Token is valid and has access to repository"
else
  echo "❌ Token validation failed"
  echo "Response: $RESPONSE"
  exit 1
fi
```

### 2. Test Raw File Access

```bash
#!/bin/bash

GITHUB_HOST="github.company.com"
GITHUB_TOKEN="${STATIC_DATA_GITHUB_TOKEN}"
OWNER="your-org"
REPO="static-data"
BRANCH="master"
FILE_PATH="data/squads.json"

echo "🔍 Testing raw file access..."

RAW_URL="https://$GITHUB_HOST/raw/$OWNER/$REPO/$BRANCH/$FILE_PATH"
echo "📡 Fetching: $RAW_URL"
echo ""

RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" "$RAW_URL")

if echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo "✅ Raw file access successful"
  echo "✅ File is valid JSON"
  echo ""
  echo "Sample content:"
  echo "$RESPONSE" | jq '.' | head -20
else
  echo "❌ Raw file access failed or invalid JSON"
  echo "Response: $RESPONSE"
  exit 1
fi
```

### 3. Test Octokit Connection (Node.js)

Create file: `test-octokit.js`

```javascript
const { Octokit } = require('@octokit/rest');

async function testConnection() {
  const githubHost = process.env.GITHUB_ENTERPRISE_HOST || 'github.company.com';
  const token = process.env.STATIC_DATA_GITHUB_TOKEN;
  const owner = 'your-org';
  const repo = 'static-data';

  console.log(`🔍 Testing Octokit connection to GitHub Enterprise`);
  console.log(`Host: ${githubHost}`);
  console.log(`Owner: ${owner}`);
  console.log(`Repo: ${repo}`);
  console.log('');

  // Create Octokit instance for GitHub Enterprise
  const octokit = new Octokit({
    baseUrl: `https://${githubHost}/api/v3`,
    auth: token,
  });

  try {
    // Test 1: Get repository info
    console.log('📡 Test 1: Fetching repository info...');
    const repoResponse = await octokit.repos.get({
      owner,
      repo,
    });
    console.log(`✅ Repository found: ${repoResponse.data.name}`);
    console.log(`   URL: ${repoResponse.data.html_url}`);
    console.log('');

    // Test 2: List directory contents
    console.log('📡 Test 2: Listing /data directory...');
    const dataDir = await octokit.repos.getContent({
      owner,
      repo,
      path: 'data',
    });
    console.log(`✅ Found ${dataDir.data.length} files/folders in /data`);
    dataDir.data.forEach(item => {
      console.log(`   - ${item.name} (${item.type})`);
    });
    console.log('');

    // Test 3: Fetch specific file
    console.log('📡 Test 3: Fetching data/squads.json...');
    const fileResponse = await octokit.repos.getContent({
      owner,
      repo,
      path: 'data/squads.json',
    });
    const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');
    const parsed = JSON.parse(content);
    console.log(`✅ File fetched and parsed successfully`);
    console.log(`   Size: ${content.length} bytes`);
    console.log(`   Items: ${Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length}`);
    console.log('');

    // Test 4: Check for build.gradle files
    console.log('📡 Test 4: Searching for build.gradle files...');
    // This would require the search API or listing repos
    console.log('✅ Build.gradle search skipped (requires additional setup)');
    console.log('');

    console.log('✅✅✅ All tests passed! GitHub Enterprise is properly configured.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Body: ${JSON.stringify(error.response.data)}`);
    }
    process.exit(1);
  }
}

testConnection();
```

Run the test:
```bash
# Install dependency if not already installed
npm install @octokit/rest

# Set your environment
export GITHUB_ENTERPRISE_HOST="github.company.com"
export STATIC_DATA_GITHUB_TOKEN="ghp_xxxxx"

# Run test
node test-octokit.js
```

---

## 🚀 Post-Update Verification

### 1. Rebuild Plugin

```bash
cd plugins/static-data-backend
yarn build

# Check for compilation errors
echo "Build status: $?"
```

### 2. Start Backstage in Development

```bash
# In workspace root
yarn install
yarn dev
```

### 3. Monitor Logs

```bash
# Watch for static-data-backend logs
tail -f logs/backstage.log | grep -i "static-data\|github\|enterprise"
```

### 4. Check Catalog API

```bash
# Test the catalog API
curl -s http://localhost:3000/api/catalog/entities \
  -H "Content-Type: application/json" | jq '.[] | {kind, metadata: {name, namespace}}'
```

### 5. Verify Data Loaded

```bash
# Check if components from GitHub Enterprise were loaded
curl -s http://localhost:3000/api/catalog/entities?filter=kind=component \
  -H "Content-Type: application/json" | jq '.' | head -50
```

---

## 🔧 Enable GitHub Enterprise in Config

**Step 1:** Edit `app-config.yaml`

```yaml
staticData:
  github:
    repo: ${STATIC_DATA_REPO}
    branch: ${STATIC_DATA_BRANCH}
    token: ${STATIC_DATA_GITHUB_TOKEN}
    enterprise:
      host: github.company.com
      apiUrl: https://github.company.com/api/v3
```

**Step 2:** Restart Backstage

```bash
# Kill existing process
pkill -f "yarn dev"

# Restart
yarn dev
```

**Step 3:** Monitor logs

```bash
# Should see:
# "StaticDataEntityProvider registered with catalog (repo: ..., branch: ...)(GitHub Enterprise: github.company.com)"
tail -f logs/backstage.log | grep "StaticDataEntityProvider"
```

---

## ❌ Troubleshooting

### Issue: "401 Unauthorized"

**Cause:** Invalid or expired token

**Solution:**
```bash
# Test token manually
curl -H "Authorization: token $STATIC_DATA_GITHUB_TOKEN" \
  https://github.company.com/api/v3/user | jq '.'
```

If this fails, regenerate token in GitHub Enterprise.

---

### Issue: "Repository not found"

**Cause:** Wrong org/repo or token doesn't have access

**Solution:**
```bash
# Verify repo exists
curl -H "Authorization: token $STATIC_DATA_GITHUB_TOKEN" \
  https://github.company.com/api/v3/repos/your-org/static-data | jq '.name'
```

---

### Issue: "getContent is not a valid path"

**Cause:** API endpoint is incorrect

**Solution:**
1. Verify `apiUrl` has `/api/v3` suffix
2. Verify host doesn't include `https://` prefix

```yaml
# ❌ Wrong
enterprise:
  host: https://github.company.com
  apiUrl: github.company.com

# ✅ Correct
enterprise:
  host: github.company.com
  apiUrl: https://github.company.com/api/v3
```

---

### Issue: "Static data not showing in catalog"

**Cause:** Plugin not initialized or GitHub connection failed

**Solution:**
1. Check logs for errors
2. Verify token is set
3. Verify files exist in repository
4. Run manual refresh:
   ```bash
   curl -X POST http://localhost:7007/api/static-data/refresh
   ```

---

## 📊 Expected Log Output

When GitHub Enterprise is properly configured, you should see:

```
[...] StaticDataEntityProvider: initializing database client...
[...] StaticDataEntityProvider: database client initialized successfully
[...] StaticDataEntityProvider registered with catalog (repo: your-org/static-data, branch: master)(GitHub Enterprise: github.company.com)
[...] StaticDataEntityProvider: scheduled refresh configured (frequency: */30 * * * *)
[...] StaticDataEntityProvider: scheduled refresh starting
[...] Fetching file data/squads.json from github.company.com...
[...] Fetching file data/applications.json from github.company.com...
[...] StaticDataEntityProvider: scheduled refresh completed - imported 47 entities with 0 errors
```

---

## ✅ Final Verification

- [ ] Token is valid and has repo access
- [ ] Raw file fetch works (curl test)
- [ ] Octokit connection succeeds (Node.js test)
- [ ] Plugin rebuilds without errors
- [ ] Backstage starts successfully
- [ ] Logs show GitHub Enterprise host
- [ ] Catalog API returns entities from GitHub Enterprise
- [ ] Scheduled refresh runs and imports entities

---

**Status:** Ready for Testing  
**Created:** November 14, 2025
