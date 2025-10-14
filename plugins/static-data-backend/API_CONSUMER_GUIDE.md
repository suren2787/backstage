# API Consumer & Provider Tracking Guide

## Overview

The Static Data Backend plugin now provides HTTP endpoints to query API producer/consumer relationships extracted from build.gradle files.

## Use Cases

### 1. **Impact Analysis**
Before making breaking changes to an API, identify all consumers:

```bash
# Who will be affected if I change payment-gateway-api-v2?
curl http://localhost:7007/api/static-data/api-consumers/payment-core-payment-gateway-api-v2
```

**Example Response:**
```json
{
  "api": "payment-core-payment-gateway-api-v2",
  "consumerCount": 5,
  "consumers": [
    { "name": "general-policy-service", "system": "general-insurance", ... },
    { "name": "travel-policy-service", "system": "travel-insurance", ... },
    ...
  ]
}
```

**Action:** Notify 5 teams before deploying API changes.

---

### 2. **Dependency Discovery**
Find which service provides a specific API:

```bash
curl http://localhost:7007/api/static-data/api-providers/mf-platform-mutual-fund-api-v1
```

**Use for:**
- Debugging: "Which service should I check for API issues?"
- Documentation: "Who owns this API?"
- Onboarding: "Where is this API implemented?"

---

### 3. **API Version Migration**
Compare consumers of old vs new API versions:

```bash
# Old version consumers
curl http://localhost:7007/api/static-data/api-consumers/payment-core-payment-gateway-api-v1

# New version consumers  
curl http://localhost:7007/api/static-data/api-consumers/payment-core-payment-gateway-api-v2
```

**Migration Strategy:**
- Identify services still on v1
- Create migration plan
- Track progress
- Deprecate v1 when consumer count = 0

---

### 4. **Service Dependency Graph**
Get complete API relationship map:

```bash
curl http://localhost:7007/api/static-data/api-relations
```

**Use for:**
- Architecture diagrams
- System understanding
- Identifying tightly coupled services
- API governance dashboards

---

## Integration Examples

### Shell Script - Impact Analysis

```bash
#!/bin/bash
API_NAME="payment-core-payment-gateway-api-v2"

echo "Analyzing impact of changes to $API_NAME..."
RESPONSE=$(curl -s "http://localhost:7007/api/static-data/api-consumers/$API_NAME")

CONSUMER_COUNT=$(echo "$RESPONSE" | jq -r '.consumerCount')
echo "⚠️  $CONSUMER_COUNT services will be affected"

echo "\nAffected services:"
echo "$RESPONSE" | jq -r '.consumers[] | "  - \(.name) (owned by \(.owner))"'
```

**Output:**
```
Analyzing impact of changes to payment-core-payment-gateway-api-v2...
⚠️  5 services will be affected

Affected services:
  - general-policy-service (owned by insurance-squad)
  - travel-policy-service (owned by insurance-squad)
  - life-policy-service (owned by insurance-squad)
  - fx-trade-api (owned by fx-squad)
  - mf-portal (owned by mf-squad)
```

---

### Python - API Dependency Report

```python
import requests
import json

def generate_api_report():
    response = requests.get('http://localhost:7007/api/static-data/api-relations')
    relations = response.json()
    
    print("# API Dependency Report\n")
    
    for api, info in relations.items():
        provider_count = len(info['providers'])
        consumer_count = len(info['consumers'])
        
        print(f"## {api}")
        print(f"- Providers: {provider_count}")
        print(f"- Consumers: {consumer_count}")
        
        if consumer_count == 0:
            print("  ⚠️  **Unused API** - Consider deprecating")
        elif consumer_count > 10:
            print("  ⚠️  **High coupling** - Consider refactoring")
        
        print()

generate_api_report()
```

---

### Node.js - Notify Teams on API Changes

```javascript
const axios = require('axios');
const slack = require('@slack/web-api');

async function notifyApiConsumers(apiName, changeDescription) {
  // Get consumers
  const response = await axios.get(
    `http://localhost:7007/api/static-data/api-consumers/${apiName}`
  );
  
  const { consumers } = response.data;
  
  // Map owners to Slack channels
  const ownerChannels = {
    'insurance-squad': '#insurance-team',
    'fx-squad': '#fx-team',
    'payments-squad': '#payments-team',
  };
  
  // Notify each team
  for (const consumer of consumers) {
    const channel = ownerChannels[consumer.owner];
    if (channel) {
      await slack.chat.postMessage({
        channel,
        text: `🚨 API Change Alert: ${apiName}\n` +
              `Your service ${consumer.name} is affected.\n` +
              `Change: ${changeDescription}`
      });
    }
  }
  
  console.log(`Notified ${consumers.length} teams`);
}

notifyApiConsumers(
  'payment-core-payment-gateway-api-v2',
  'New rate limiting: 1000 req/min'
);
```

---

## CI/CD Integration

### GitHub Actions - Block Breaking Changes

```yaml
name: API Impact Check
on: pull_request

jobs:
  check-api-impact:
    runs-on: ubuntu-latest
    steps:
      - name: Get API consumers
        run: |
          API_NAME="payment-core-payment-gateway-api-v2"
          CONSUMERS=$(curl -s "http://backstage.company.com/api/static-data/api-consumers/$API_NAME")
          COUNT=$(echo "$CONSUMERS" | jq -r '.consumerCount')
          
          if [ "$COUNT" -gt 0 ]; then
            echo "::warning::This API has $COUNT consumers. Breaking changes require migration plan."
            echo "$CONSUMERS" | jq -r '.consumers[] | "- \(.name)"'
          fi
```

---

### Jenkins - API Deprecation Check

```groovy
pipeline {
  stages {
    stage('Check API Usage') {
      steps {
        script {
          def apiName = "order-core-order-api-v1"
          def response = sh(
            script: "curl -s http://backstage/api/static-data/api-consumers/${apiName}",
            returnStdout: true
          )
          
          def json = readJSON text: response
          
          if (json.consumerCount == 0) {
            echo "✅ API ${apiName} has no consumers. Safe to deprecate."
          } else {
            error("❌ API ${apiName} still has ${json.consumerCount} consumers")
          }
        }
      }
    }
  }
}
```

---

## Monitoring & Dashboards

### Grafana Dashboard Query

Create metrics from API relations:

```bash
# Count consumers per API
curl -s http://localhost:7007/api/static-data/api-relations | \
  jq -r 'to_entries[] | "\(.key) \(.value.consumers | length)"'
```

**Output for Prometheus:**
```
api_consumer_count{api="payment-core-payment-gateway-api-v2"} 5
api_consumer_count{api="order-core-order-api-v1"} 1
api_consumer_count{api="mf-platform-mutual-fund-api-v1"} 1
```

---

### Backstage UI Plugin (Future)

Create a custom Backstage frontend plugin to visualize:

1. **API Dependency Graph** - Interactive network diagram
2. **Consumer List** - Table with filtering by owner/system
3. **Impact Heatmap** - Which APIs affect most services
4. **Migration Tracker** - API version adoption progress

---

## Best Practices

### 1. **Before API Changes**
```bash
# Always check consumers first
curl http://localhost:7007/api/static-data/api-consumers/{api-name}

# If consumerCount > 0:
#   - Create migration guide
#   - Notify all owners
#   - Plan deprecation timeline
```

### 2. **API Versioning**
```bash
# Check if old version can be deprecated
OLD_CONSUMERS=$(curl -s http://localhost:7007/api/static-data/api-consumers/api-v1 | jq '.consumerCount')
NEW_CONSUMERS=$(curl -s http://localhost:7007/api/static-data/api-consumers/api-v2 | jq '.consumerCount')

if [ "$OLD_CONSUMERS" -eq 0 ] && [ "$NEW_CONSUMERS" -gt 0 ]; then
  echo "✅ Migration complete. Can deprecate v1"
fi
```

### 3. **Quarterly API Health Check**
```bash
# Identify unused APIs
curl -s http://localhost:7007/api/static-data/api-relations | \
  jq -r 'to_entries[] | select(.value.consumers | length == 0) | .key'

# Review for deprecation
```

---

## Troubleshooting

### Empty Consumer List

**Problem:** API shows 0 consumers but you know services use it.

**Causes:**
1. Component's build.gradle missing openapi.consumer block
2. API name mismatch (check exact spelling/version)
3. Component repository not in applications.json

**Solution:**
```bash
# Check if API exists
curl http://localhost:7007/api/static-data/api-relations | jq 'keys'

# Verify component's build.gradle
curl https://raw.githubusercontent.com/{org}/{repo}/main/build.gradle
```

---

### Stale Data

**Problem:** Recent changes not reflected.

**Solution:**
```bash
# Trigger manual refresh
curl -X POST http://localhost:7007/api/static-data/refresh

# Then query again
curl http://localhost:7007/api/static-data/api-consumers/{api-name}
```

---

## Future Enhancements

- [ ] Add authentication/authorization to endpoints
- [ ] Cache results for performance
- [ ] Add WebSocket for real-time updates
- [ ] Include API change history
- [ ] Add breaking change detection
- [ ] Generate dependency graphs (GraphQL endpoint)
- [ ] Email notifications for API changes
- [ ] API usage metrics (request counts)

---

## Support

For issues or questions:
- Check logs: `docker logs backstage-backend | grep StaticDataProvider`
- Review README.md for configuration
- Verify build.gradle format matches documentation
