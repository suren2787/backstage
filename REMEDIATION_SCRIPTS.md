# Security Remediation Scripts
**Date:** October 19, 2025  
**Purpose:** Automated fixes for identified vulnerabilities

---

## 🚀 Quick Remediation Commands

### 1. Fix CORS & HTTPS Configuration

```bash
#!/bin/bash
# Script: fix-cors-https.sh

echo "🔧 Fixing CORS and HTTPS Configuration..."

# Update app-config.yaml to use HTTPS
cat > app-config-https.yaml << 'EOF'
# HTTPS Configuration Update
# Replace the CORS section with:

cors:
  origin: https://localhost:3000
  methods: [GET, HEAD, POST, PUT]      # Removed DELETE
  credentials: true
  maxAge: 3600
  allowedHeaders: ["Content-Type", "Authorization"]
  exposedHeaders: ["X-Total-Count"]
  preflightContinue: false

# Add HTTPS settings to backend:
backend:
  baseUrl: https://localhost:7007
  listen:
    port: 7007
  https:
    certificate:
      cert: ./certificates/localhost.crt
      key: ./certificates/localhost.key

# Update app baseUrl:
app:
  baseUrl: https://localhost:3000
EOF

echo "✅ Configuration template created at app-config-https.yaml"
echo "📝 Review and merge with your app-config.yaml"
```

---

### 2. Generate Self-Signed Certificates

```bash
#!/bin/bash
# Script: generate-certificates.sh

echo "🔐 Generating Self-Signed Certificates..."

# Create certificates directory
mkdir -p certificates

# Generate private key and certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout certificates/localhost.key \
  -out certificates/localhost.crt \
  -days 365 \
  -subj "/CN=localhost/O=Development/C=US"

# Set proper permissions
chmod 600 certificates/localhost.key
chmod 644 certificates/localhost.crt

echo "✅ Certificates generated:"
echo "   - certificates/localhost.crt"
echo "   - certificates/localhost.key"
echo ""
echo "📝 Add to .gitignore:"
echo "   certificates/*.key"
echo "   certificates/*.pem"
```

---

### 3. Add Security Headers

```bash
#!/bin/bash
# Script: add-security-headers.sh

echo "🛡️  Adding Security Headers..."

cat > security-headers.yaml << 'EOF'
# Add this to backend section in app-config.yaml:

backend:
  csp:
    # Frame Protection
    frame-options: "DENY"
    
    # Content Type Protection
    content-type-options: "nosniff"
    
    # XSS Protection
    xss-filter: true
    
    # Referrer Policy
    referrer-policy: "strict-origin-when-cross-origin"
    
    # Feature Policy / Permissions Policy
    permissions-policy: "geolocation=(), microphone=(), camera=()"
    
    # HSTS (Strict Transport Security)
    strict-transport-security: "max-age=31536000; includeSubDomains; preload"
    
    # CSP Policy (relaxed for Backstage)
    default-src: ["'self'"]
    script-src: ["'self'", "'unsafe-inline'"]  # Backstage needs this
    style-src: ["'self'", "'unsafe-inline'"]   # Backstage needs this
    connect-src: ["'self'", "https:"]
    img-src: ["'self'", "data:", "https:"]
    font-src: ["'self'", "data:"]
EOF

echo "✅ Security headers template created"
echo "📝 Merge the content into app-config.yaml"
```

---

### 4. Enable Service-to-Service Auth

```bash
#!/bin/bash
# Script: enable-service-auth.sh

echo "🔐 Enabling Service-to-Service Authentication..."

# Generate a secure random secret
BACKEND_SECRET=$(openssl rand -base64 32)

echo "Generated BACKEND_SECRET:"
echo "$BACKEND_SECRET"
echo ""
echo "Add to .env:"
echo "BACKEND_SECRET=$BACKEND_SECRET"
echo ""

cat > backend-auth.yaml << 'EOF'
# Add to backend section in app-config.yaml:

backend:
  auth:
    keys:
      - secret: ${BACKEND_SECRET}
EOF

echo "✅ Auth configuration template created"
```

---

### 5. Setup Secrets Management

```bash
#!/bin/bash
# Script: setup-vault-client.sh

echo "📦 Setting up Secrets Management..."

echo ""
echo "Option 1: Using AWS Secrets Manager"
echo "======================================"
cat << 'EOF'
# Install AWS CLI
brew install awscli  # macOS
# or sudo apt-get install awscli  # Linux

# Store GitHub Token
aws secretsmanager create-secret \
  --name backstage/github-token \
  --secret-string "ghp_your_token_here"

# Update app-config.yaml:
# auth:
#   keys:
#     - secret: ${BACKEND_SECRET}
EOF

echo ""
echo "Option 2: Using HashiCorp Vault"
echo "=================================="
cat << 'EOF'
# Install Vault
brew install vault  # macOS

# Start dev server
vault server -dev

# Store secrets
vault kv put secret/backstage/github \
  token="ghp_your_token_here"

# In Node.js code:
// npm install node-vault
const vault = require('node-vault')();
const secret = await vault.read('secret/data/backstage/github');
EOF
```

---

### 6. Migrate to GitHub App Authentication

```bash
#!/bin/bash
# Script: migrate-github-app.sh

echo "🔄 GitHub App Migration Guide..."

cat << 'EOF'
## Step 1: Create GitHub App

1. Go to GitHub Settings → Developer settings → GitHub Apps
2. Click "New GitHub App"
3. Fill in:
   - App name: "Backstage-Deployment"
   - Homepage URL: https://yourcompany.com
   - Webhook URL: https://your-backstage-url/api/webhooks/github
   - Permissions needed:
     - Contents: Read-only
     - Metadata: Read-only
     - Pull Requests: Read-only

4. Generate private key (keep secure!)
5. Note App ID and Client ID

## Step 2: Update Configuration

Add to app-config.yaml:

integrations:
  github:
    - host: github.com
      apps:
        - appId: ${GITHUB_APP_ID}
          clientId: ${GITHUB_APP_CLIENT_ID}
          clientSecret: ${GITHUB_APP_CLIENT_SECRET}
          webhookUrl: https://your-backstage-url/api/webhooks/github
          webhookSecret: ${GITHUB_WEBHOOK_SECRET}
          privateKey: ${GITHUB_APP_PRIVATE_KEY}

## Step 3: Update .env

GITHUB_APP_ID=123456
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=xxxxxxxxxxxxx
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET=webhook_secret_here

## Step 4: Test Connection

curl -X GET http://localhost:7007/api/integration/github/status

EOF

echo "✅ Guide created. Reference GitHub App docs:"
echo "   https://backstage.io/docs/integrations/github/locations"
```

---

### 7. Setup Token Rotation

```bash
#!/bin/bash
# Script: setup-token-rotation.sh

echo "🔄 Setting up Automated Token Rotation..."

cat > token-rotation-lambda.js << 'EOF'
// AWS Lambda Function for GitHub Token Rotation
// Deploy with: aws lambda create-function --runtime nodejs18.x ...

const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();
const github = require('@octokit/rest');

exports.handler = async (event) => {
  console.log('Starting token rotation...');
  
  try {
    // 1. Get current token from Secrets Manager
    const secret = await secretsManager.getSecretValue({
      SecretId: 'backstage/github-token'
    }).promise();
    
    const currentToken = JSON.parse(secret.SecretString).token;
    
    // 2. Create new token via GitHub API (using current token)
    const octokit = new github.Octokit({ auth: currentToken });
    
    const newAuth = await octokit.authorizations.createAuthorization({
      scopes: ['repo'],
      note: `Backstage Token ${new Date().toISOString()}`
    });
    
    // 3. Store new token
    await secretsManager.putSecretValue({
      SecretId: 'backstage/github-token',
      SecretString: JSON.stringify({ token: newAuth.data.token })
    }).promise();
    
    // 4. Revoke old token
    await octokit.authorizations.revokeAuthorizationForApplication({
      client_id: process.env.GITHUB_CLIENT_ID,
      access_token: currentToken
    }).promise();
    
    console.log('✅ Token rotation completed successfully');
    return { status: 'success' };
    
  } catch (error) {
    console.error('❌ Token rotation failed:', error);
    throw error;
  }
};
EOF

echo "✅ Token rotation Lambda function created"
echo "📝 Configure CloudWatch Events to run this daily/weekly"
```

---

### 8. Install Dependency Vulnerability Scanner

```bash
#!/bin/bash
# Script: setup-dependency-scanning.sh

echo "📦 Setting up Dependency Vulnerability Scanning..."

echo ""
echo "Option 1: Using npm audit"
echo "========================="
echo "npm audit --audit-level=moderate"
echo "npm audit --json > audit-report.json"

echo ""
echo "Option 2: Using Snyk"
echo "===================="
npm install -g snyk
snyk auth
snyk test --all-projects
snyk monitor --all-projects

echo ""
echo "Option 3: Using OWASP Dependency-Check"
echo "======================================="
brew install owasp-dependency-check  # macOS
dependency-check --project "Backstage" --scan .
```

---

## 📝 Implementation Checklist

```
WEEK 1 - CRITICAL
================
- [ ] Generate self-signed certificates
- [ ] Update CORS to use HTTPS
- [ ] Add security headers (X-Frame-Options, HSTS, etc.)
- [ ] Test HTTPS configuration
- [ ] Update documentation

WEEK 2 - HIGH
=============
- [ ] Generate BACKEND_SECRET
- [ ] Enable service-to-service auth
- [ ] Setup GitHub App (start process)
- [ ] Document token management procedure
- [ ] Test auth flow

WEEK 3-4 - HIGH (continued)
===========================
- [ ] Complete GitHub App migration
- [ ] Setup token rotation (Lambda/cron)
- [ ] Remove old PAT tokens
- [ ] Audit GitHub App permissions
- [ ] Test all integrations

WEEK 5+ - MEDIUM
================
- [ ] Setup secrets manager (AWS/Vault)
- [ ] Migrate secrets from .env
- [ ] Setup dependency scanning
- [ ] Create SECURITY.md
- [ ] Plan security training
```

---

## 🧪 Verification Commands

```bash
# Test HTTPS configuration
curl -I https://localhost:7007/api/health 2>&1 | grep -E "HTTP|security"

# Check security headers
curl -I https://localhost:7007 | grep -E "X-Frame|Strict-Transport|X-Content"

# Test service auth
curl -H "Authorization: Bearer ${BACKEND_SECRET}" \
  https://localhost:7007/api/catalog/entities

# Verify CORS
curl -I -H "Origin: https://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  https://localhost:7007/api/catalog/entities
```

---

## 📚 Resources

- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [GitHub App Documentation](https://docs.github.com/en/developers/apps)
- [Backstage Security Guide](https://backstage.io/docs/overview/architecture-overview#security-overview)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Created:** October 19, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation
