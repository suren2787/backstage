# GitHub Enterprise - Quick Start Guide

**TL;DR:** Enable GitHub Enterprise support in 3 steps

---

## 🚀 Quick Setup (2 minutes)

### Step 1: Update Configuration

Edit `app-config.yaml` and uncomment the enterprise section:

```yaml
staticData:
  github:
    repo: ${STATIC_DATA_REPO}
    branch: ${STATIC_DATA_BRANCH}
    token: ${STATIC_DATA_GITHUB_TOKEN}
    enterprise:
      host: github.company.com           # Replace with your host
      apiUrl: https://github.company.com/api/v3
```

### Step 2: Rebuild

```bash
cd plugins/static-data-backend
yarn build
```

### Step 3: Restart

```bash
yarn dev
```

---

## ✅ Verify It Works

Check logs for this message:
```
StaticDataEntityProvider registered with catalog (repo: your-org/static-data, branch: master)(GitHub Enterprise: github.company.com)
```

---

## 🔑 Required Information

Get these from your GitHub Enterprise admin:
- **Host:** `github.company.com` (without `https://`)
- **API URL:** `https://github.company.com/api/v3` (with `/api/v3`)
- **Token:** Personal Access Token with `repo` scope

---

## 🧪 Test Token (1-liner)

```bash
curl -H "Authorization: token $STATIC_DATA_GITHUB_TOKEN" \
  https://github.company.com/api/v3/user | jq '.login'
```

If you see your username, token is valid ✅

---

## ❌ Common Issues

| Issue | Fix |
|-------|-----|
| "401 Unauthorized" | Token expired or invalid |
| "Repository not found" | Token doesn't have access |
| "API error" | Wrong host or apiUrl |

**More help:** See `TEST_GITHUB_ENTERPRISE.md`

---

## 📚 Full Documentation

- **Setup Guide:** `GITHUB_ENTERPRISE_SETUP.md`
- **Testing Guide:** `TEST_GITHUB_ENTERPRISE.md`
- **Implementation Details:** `IMPLEMENTATION_COMPLETE.md`

---

**For public GitHub:** No changes needed - works as before ✅
