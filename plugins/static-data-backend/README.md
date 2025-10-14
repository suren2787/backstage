# Static Data Backend Plugin

A Backstage backend plugin that ingests catalog entities from a GitHub repository containing static JSON data files and build.gradle files.

## Features

### ✅ **Implemented**

#### 1. Static Data Ingestion
- **APIs**: Automatically ingests OpenAPI definitions from `contracts/{bounded-context}/openapi/{api}/{version}.yaml`
- **Components**: Loads applications from `data/applications.json`
- **Groups**: Loads teams/squads from `data/squads.json`
- **Domains/Systems**: Loads bounded contexts from `data/bounded-contexts.json`

#### 2. Build.gradle Parsing & API Relations
- **Automatic Discovery**: Fetches `build.gradle` from each component's GitHub repository
- **Producer/Consumer Extraction**: Parses `openapi { producer { ... } consumer { ... } }` blocks
- **Smart Mapping**: Links APIs to components via `providesApis` and `consumesApis` spec fields
- **Format Conversion**: Converts `"system:api:version"` to Backstage entity names (`system-api-vX`)

### 🔄 **Proposed Enhancements**

#### Phase 1 - Event-Driven Architecture
- **Avro Schema Relations**: Extract event producer/consumer from `avro { ... }` blocks
- **Event Entity Type**: Create Event entities and link via `publishesEvents`/`consumesEvents`

#### Phase 2 - Enhanced Context
- **Internal Dependencies**: Extract `project(':module')` dependencies
- **Database/Infrastructure**: Parse database and Kafka topic configurations
- **Technology Stack**: Extract framework and library versions from dependencies

#### Phase 3 - Operations
- **Build Configuration**: Docker images, versions, registry information
- **Quality Metrics**: Test coverage, SonarQube integration
- **Service Metadata**: Ports, health checks, metrics endpoints

---

## Configuration

### Environment Variables

```yaml
# app-config.yaml
staticData:
  github:
    repo: ${STATIC_DATA_REPO}          # e.g., "myorg/static-data"
    branch: ${STATIC_DATA_BRANCH}      # e.g., "master" or "main"
    token: ${STATIC_DATA_GITHUB_TOKEN} # GitHub personal access token

  # Optional: Override default file paths
  files:
    applications: 'data/applications.json'
    squads: 'data/squads.json'
    boundedContexts: 'data/bounded-contexts.json'
    domains: 'data/domains.json'
```

### GitHub Repository Structure

```
static-data/
├── data/
│   ├── applications.json      # Component definitions
│   ├── squads.json            # Team/group definitions
│   ├── bounded-contexts.json  # System/domain definitions
│   └── domains.json           # Top-level domains
└── contracts/
    └── {bounded-context}/
        └── openapi/
            └── {api}/
                ├── v1.yaml
                └── v2.yaml
```

---

## Build.gradle Integration

### Supported Format

The plugin parses `build.gradle` files from component repositories to extract API relations.

#### Example build.gradle:

```gradle
openapi {
    producer {
        javaspring("payment-core:payment-gateway-api:2.0.0") {
            configOptions = []
        }
    }
    consumer {
        java("order-core:order-api:1.0.0")
    }
}
```

### How It Works

1. **Repository Discovery**: Extracts GitHub repo URL from `applications.json` component definitions
2. **File Fetching**: Attempts to fetch `build.gradle` from `main` or `master` branch
3. **Regex Parsing**: Uses pattern matching to find API declarations in producer/consumer blocks
4. **Format Conversion**: Converts `"system:api:version"` to Backstage entity format
5. **Validation**: Only links to APIs that exist in the catalog
6. **Spec Enhancement**: Adds `providesApis` and `consumesApis` arrays to component specs

### Naming Convention

| Gradle Format | Backstage Entity Name |
|---------------|----------------------|
| `payment-core:payment-gateway-api:1.0.0` | `payment-core-payment-gateway-api-v1` |
| `order-core:order-api:2.5.0` | `order-core-order-api-v2` |
| `mf-platform:mutual-fund-api:3.0.0` | `mf-platform-mutual-fund-api-v3` |

**Rules:**
- System and API names are preserved with hyphens
- Version is converted to `vX` format (major version only)
- Entity reference format: `API:default/{system-api-vX}`

---

## Component Entity Structure

### Enhanced Component Spec

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-gateway
  title: Payment Gateway
  description: Core payment processing service
  annotations:
    backstage.io/managed-by-location: 'static-data:import'
    backstage.io/source-location: 'url:https://github.com/myorg/payment-gateway'
spec:
  type: service
  lifecycle: production
  owner: payments-squad
  system: payment-core
  tags:
    - service
  
  # API Relations (from build.gradle)
  providesApis:
    - API:default/payment-core-payment-gateway-api-v1
    - API:default/payment-core-payment-gateway-api-v2
  
  consumesApis:
    - API:default/order-core-order-api-v1
```

---

## API Discovery Process

### Flow Diagram

```
1. Load applications.json from GitHub
   ↓
2. For each application:
   ↓
3. Extract repository URL
   ↓
4. Fetch build.gradle (try main/master)
   ↓
5. Parse openapi blocks with regex
   ↓
6. Extract producer API strings → ["system:api:version"]
   ↓
7. Convert to Backstage format → ["system-api-vX"]
   ↓
8. Filter against existing API entities
   ↓
9. Add to component spec:
   - providesApis: [API:default/...]
   - consumesApis: [API:default/...]
   ↓
10. Transform to Backstage Component entity
    ↓
11. Apply to catalog
```

---

## Logging & Debugging

### Key Log Messages

**Successful Parsing:**
```
StaticDataProvider: build.gradle for payment-gateway (myorg/payment-gateway) 
  - extracted produces: ["payment-core-payment-gateway-api-v2"]
  - consumes: ["order-core-order-api-v1"]

StaticDataProvider: payment-gateway - filtered produces: ["payment-core-payment-gateway-api-v2"], 
  filtered consumes: ["order-core-order-api-v1"]

StaticDataProvider: Component payment-gateway spec: {
  "providesApis":["API:default/payment-core-payment-gateway-api-v2"],
  "consumesApis":["API:default/order-core-order-api-v1"]
}
```

**Errors:**
```
StaticDataProvider: Failed to fetch/parse build.gradle for myorg/repo: 
  No commit found for the ref master
```

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| No providesApis/consumesApis in spec | build.gradle not found | Check repo URL in applications.json |
| Empty arrays after filtering | API names don't match catalog | Verify API entity names match gradle format |
| 404 errors for build.gradle | Wrong branch name | Ensure repo uses `main` or `master` branch |
| No API extraction | Wrong gradle format | Verify `openapi { producer/consumer }` syntax |

---

## HTTP API Endpoints

### 1. Manual Refresh

Trigger a manual catalog refresh:

```bash
curl -X POST http://localhost:7007/api/static-data/refresh
```

**Response:**
```json
{
  "imported": 62,
  "errors": []
}
```

---

### 2. Get API Consumers

List all components that consume a specific API:

```bash
curl http://localhost:7007/api/static-data/api-consumers/payment-core-payment-gateway-api-v2
```

**Response:**
```json
{
  "api": "payment-core-payment-gateway-api-v2",
  "consumerCount": 5,
  "consumers": [
    {
      "name": "general-policy-service",
      "system": "general-insurance",
      "owner": "insurance-squad",
      "type": "service"
    },
    {
      "name": "travel-policy-service",
      "system": "travel-insurance",
      "owner": "insurance-squad",
      "type": "service"
    },
    {
      "name": "life-policy-service",
      "system": "life-insurance",
      "owner": "insurance-squad",
      "type": "service"
    },
    {
      "name": "fx-trade-api",
      "system": "fx-trading",
      "owner": "fx-squad",
      "type": "api"
    },
    {
      "name": "mf-portal",
      "system": "mf-platform",
      "owner": "mf-squad",
      "type": "portal"
    }
  ]
}
```

---

### 3. Get API Providers

List all components that provide/produce a specific API:

```bash
curl http://localhost:7007/api/static-data/api-providers/payment-core-payment-gateway-api-v2
```

**Response:**
```json
{
  "api": "payment-core-payment-gateway-api-v2",
  "providerCount": 1,
  "providers": [
    {
      "name": "payment-gateway",
      "system": "payment-core",
      "owner": "payments-squad",
      "type": "service"
    }
  ]
}
```

---

### 4. Get All API Relations

Get a comprehensive view of all API producer/consumer relationships:

```bash
curl http://localhost:7007/api/static-data/api-relations
```

**Response:**
```json
{
  "payment-core-payment-gateway-api-v1": {
    "providers": ["payment-gateway"],
    "consumers": []
  },
  "payment-core-payment-gateway-api-v2": {
    "providers": ["payment-gateway"],
    "consumers": [
      "general-policy-service",
      "travel-policy-service",
      "life-policy-service",
      "fx-trade-api",
      "mf-portal"
    ]
  },
  "order-core-order-api-v1": {
    "providers": ["order-api"],
    "consumers": ["order-validator"]
  },
  "mf-platform-mutual-fund-api-v1": {
    "providers": ["mf-portal"],
    "consumers": ["mf-settlement"]
  }
}
```

**Use Cases:**
- **Impact Analysis**: Determine which services will be affected by API changes
- **Dependency Mapping**: Visualize service dependencies
- **API Governance**: Identify unused or over-dependent APIs
- **Migration Planning**: Plan API version upgrades

---

## Development

### File Structure

```
plugins/static-data-backend/
├── src/
│   ├── provider.ts      # Main entity provider with build.gradle integration
│   ├── fetcher.ts       # GitHub file fetching & gradle parsing
│   ├── transformer.ts   # Entity transformation logic
│   ├── schemas.ts       # JSON schema validation
│   └── service/
│       └── router.ts    # HTTP endpoints (/health, /refresh)
└── package.json
```

### Key Functions

**provider.ts:**
- `refresh()`: Main ingestion loop, fetches data and parses build.gradle
- Repo extraction logic with regex pattern matching
- API filtering against catalog entities

**fetcher.ts:**
- `fetchAndParseBuildGradle()`: Fetches gradle file with branch fallback
- `extractOpenApiRelations()`: Regex-based API extraction from raw content
- Pattern: `/producer\s*\{[\s\S]*?\}/gi` and `/consumer\s*\{[\s\S]*?\}/gi`

**transformer.ts:**
- `applicationToComponent()`: Transforms JSON to Component entity
- Conditionally adds `providesApis` and `consumesApis` to spec

---

## Testing

### Test Data Setup

1. Create test repositories with build.gradle files
2. Add repository URLs to applications.json
3. Ensure OpenAPI definitions exist in contracts folder
4. Trigger refresh and verify logs

### Validation Checklist

- [ ] Components created with correct metadata
- [ ] APIs extracted from build.gradle
- [ ] providesApis array populated (if producer)
- [ ] consumesApis array populated (if consumer)
- [ ] API entity references valid (exist in catalog)
- [ ] Component specs visible in Backstage UI

---

## Future Enhancements

### Planned Features

1. **Avro Schema Integration**
   - Parse `avro { ... }` blocks
   - Create Event entity kind
   - Link via `publishesEvents`/`consumesEvents`

2. **Dependency Graphs**
   - Extract internal project dependencies
   - Visualize component coupling
   - Track shared library usage

3. **Infrastructure Mapping**
   - Database schema dependencies
   - Kafka topic mappings
   - Cache system usage

4. **Technology Stack**
   - Framework versions (Spring Boot, etc.)
   - Library dependency tracking
   - Security vulnerability scanning

5. **Build Metadata**
   - Docker image tags
   - Deployment configurations
   - Version history

---

## Contributing

When adding new build.gradle parsing features:

1. Update `extractOpenApiRelations()` in `fetcher.ts`
2. Add new spec fields in `transformer.ts`
3. Update this documentation
4. Add test cases
5. Update logging for debugging

---

## References

- [Backstage Entity Model](https://backstage.io/docs/features/software-catalog/descriptor-format)
- [Entity Provider Pattern](https://backstage.io/docs/features/software-catalog/life-of-an-entity)
- [API Entities](https://backstage.io/docs/features/software-catalog/descriptor-format#kind-api)
