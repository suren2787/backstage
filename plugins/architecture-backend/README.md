# Architecture Backend Plugin

A Backstage backend plugin for discovering and visualizing bounded contexts based on Domain-Driven Design (DDD) principles.

## ✅ **Production Ready - Works with Your Real Catalog Data**

This plugin **automatically discovers bounded contexts from your existing Backstage catalog**. No additional configuration needed beyond the prerequisites below.

**What it discovers:**
- ✅ All components in your catalog (from static-data, GitHub, or any catalog source)
- ✅ Bounded contexts by grouping components using `spec.system` field
- ✅ API relationships via `providesApis` and `consumesApis`
- ✅ Cross-context dependencies and DDD patterns
- ✅ GitHub repository URLs from component annotations

**It works with:**
- Static data imports (applications.yaml)
- GitHub discovery locations
- Manually registered entities
- Any Backstage catalog provider

## Features

- **Bounded Context Discovery**: Automatically discovers bounded contexts from your Backstage catalog
- **Context Mapping**: Identifies relationships between contexts using DDD patterns
- **API Dependency Analysis**: Maps API relationships to context boundaries
- **GitHub Integration**: Extracts GitHub URLs from multiple annotation formats
- **Direct Database Access**: Queries catalog database directly for performance (prerequisite)
- **Mock Data Support**: Optional mock data for testing/development (see TESTING_WITH_MOCK_DATA.md)

## Prerequisites

⚠️ **Important**: This plugin requires direct database access to the Backstage catalog database. It queries the `final_entities` table directly using Knex.

Make sure your backend has database permissions configured correctly.

**Required in your catalog:**
- Components with `spec.system` field (defines bounded context)
- APIs linked to components via `providesApis` and `consumesApis`
- (Optional) GitHub annotations for repository URLs

## Installation

1. Add the plugin to your backend:

```bash
cd packages/backend
yarn add @suren/architecture-backend
```

2. Register **both** the HTTP plugin and catalog module in `packages/backend/src/index.ts`:

```typescript
// HTTP endpoints for API access
backend.add(import('../../plugins/architecture-backend/src/index'));

// Catalog module for direct DB access
backend.add(import('../../plugins/architecture-backend/src/module'));
```

## API Endpoints

### GET `/api/architecture/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Architecture plugin is running"
}
```

### GET `/api/architecture/context-map`
Get complete context map with all contexts and relationships.

**Response:**
```json
{
  "contexts": [...],
  "relationships": [...],
  "metadata": {
    "generatedAt": "2025-10-14T12:00:00.000Z",
    "version": "1.0",
    "totalContexts": 5,
    "totalRelationships": 12
  }
}
```

### GET `/api/architecture/contexts`
Get list of all bounded contexts.

**Response:**
```json
{
  "contexts": [
    {
      "id": "payment-domain",
      "name": "Payment Domain",
      "components": [...],
      "providedApis": [...],
      "consumedApis": [...]
    }
  ],
  "total": 5
}
```

### GET `/api/architecture/contexts/:contextId`
Get detailed information about a specific context including upstream and downstream relationships.

**Response:**
```json
{
  "context": {...},
  "upstream": [...],
  "downstream": [...]
}
```

### GET `/api/architecture/contexts/:contextId/dependencies`
Get dependency information for a specific context.

**Response:**
```json
{
  "contextId": "payment-domain",
  "upstream": [...],
  "downstream": [...],
  "upstreamCount": 2,
  "downstreamCount": 3
}
```

## DDD Context Mapping Patterns

The plugin identifies the following DDD relationship patterns:

- **SHARED_KERNEL**: Two contexts share a common model
- **CUSTOMER_SUPPLIER**: Downstream is customer, upstream is supplier
- **CONFORMIST**: Downstream conforms to upstream model
- **ANTICORRUPTION_LAYER**: Downstream protects itself with translation layer
- **OPEN_HOST_SERVICE**: Upstream provides well-defined protocol
- **PUBLISHED_LANGUAGE**: Shared, well-documented language/schema
- **SEPARATE_WAYS**: No connection between contexts
- **PARTNERSHIP**: Mutual dependency, coordinated planning

## How It Works

### Data Model

**Key Principle:** `spec.system` = Bounded Context ID

- Each Component has exactly ONE `spec.system` (its bounded context)
- Multiple Components can share the same `spec.system` (1:N relationship)
- APIs are aggregated from all components within a bounded context
- Relationships link bounded contexts (not individual components)

**Bounded Context Discovery Algorithm:**

```typescript
// 1. Group components by spec.system
for each Component:
  boundedContext = component.spec.system
  
  if boundedContext not exists:
    create new BoundedContext(id: boundedContext)
  
  add component to boundedContext.components[]
  aggregate component.providesApis → boundedContext.providedApis[]
  aggregate component.consumesApis → boundedContext.consumedApis[]

// 2. Result: Map of Bounded Contexts with their microservices
{
  "payment-core": {
    components: ["payment-gateway", "payment-validator"],
    providedApis: ["payment-gateway-api", "payment-validation-api"],
    consumedApis: ["account-api"]
  }
}
```

### Relationship Inference

Relationships are detected **between bounded contexts** based on their microservices' API dependencies:

```typescript
// Example: payment-core consumes account-api

payment-gateway (Component):
  spec.system: payment-core
  spec.consumesApis: [account-api]

account-service (Component):
  spec.system: account-management
  spec.providesApis: [account-api]

→ Relationship: account-management → payment-core (via account-api)
   Type: OPEN_HOST_SERVICE (OpenAPI)
```

**Fallback Strategy:**

If a component doesn't have `spec.system`:

```typescript
const contextId = component.spec.system 
               || component.metadata.annotations['backstage.io/domain']
               || 'default-context';
```

### Catalog Structure Example

```yaml
# Domain (optional grouping)
kind: Domain
metadata:
  name: payments

# Bounded Context (System)
kind: System
metadata:
  name: payment-core
  title: Payment Core Context
spec:
  owner: payments-squad

# Microservice 1 (Component)
kind: Component
metadata:
  name: payment-gateway
spec:
  type: service
  system: payment-core  # ← Links to Bounded Context
  owner: payments-squad
  providesApis:
    - payment-gateway-api
  consumesApis:
    - account-api

# Microservice 2 (Component)
kind: Component
metadata:
  name: payment-validator
spec:
  type: service
  system: payment-core  # ← Same Bounded Context
  owner: payments-squad
  providesApis:
    - payment-validation-api
```

## DDD Context Mapping Patterns

The plugin identifies the following DDD relationship patterns:

- **SHARED_KERNEL**: Two contexts share a common model (same domain)
- **CUSTOMER_SUPPLIER**: Downstream is customer, upstream is supplier
- **CONFORMIST**: Downstream conforms to upstream model
- **ANTICORRUPTION_LAYER**: Downstream protects itself with translation layer
- **OPEN_HOST_SERVICE**: Upstream provides well-defined protocol (OpenAPI/gRPC)
- **PUBLISHED_LANGUAGE**: Shared, well-documented language/schema
- **SEPARATE_WAYS**: No connection between contexts
- **PARTNERSHIP**: Mutual dependency, coordinated planning

**Detection Logic:**

1. **Same Domain** → `SHARED_KERNEL`
2. **OpenAPI/gRPC** → `OPEN_HOST_SERVICE`
3. **Default** → `CUSTOMER_SUPPLIER`

## Configuration

### Basic Setup (Production)

No additional configuration required! The plugin automatically:
- Discovers all entities from your catalog database
- Groups components by `spec.system`
- Infers relationships from API dependencies

### Testing Setup (Optional Mock Data)

For testing/development, you can load mock data:

```bash
export ARCHITECTURE_USE_MOCK_DATA=true
yarn workspace backend start
```

This loads 23 additional mock entities alongside your real data. See `TESTING_WITH_MOCK_DATA.md` for details.

**Note:** Mock data is **NOT required** for production use. The plugin works with your real catalog data.

## Development

```bash
# Install dependencies
yarn install

# Build
yarn build

# Lint
yarn lint
```

## Example Usage

```bash
# Get all contexts
curl http://localhost:7007/api/architecture/contexts

# Get context map
curl http://localhost:7007/api/architecture/context-map

# Get specific context
curl http://localhost:7007/api/architecture/contexts/payment-domain

# Get context dependencies
curl http://localhost:7007/api/architecture/contexts/payment-domain/dependencies
```

## Current Capabilities vs Future Enhancements

### ✅ Currently Working (Phase 0-4)
- ✅ **Context Discovery** - Groups components by `spec.system`
- ✅ **API Aggregation** - Combines APIs from all services in context
- ✅ **Relationship Detection** - Finds cross-context API dependencies
- ✅ **GitHub URL Extraction** - Multiple annotation format support
- ✅ **DDD Patterns** - Infrastructure for all 8 DDD relationship types
- ✅ **REST API** - 5 endpoints for querying context map
- ✅ **Works with Real Catalog Data** - No mock data needed

### 🔮 Future Enhancements (Phase 5+)
These add **deeper analysis** capabilities:

- [ ] **Repository Analysis** - Clone repos and parse `application.yml` for databases/Kafka topics
- [ ] **Shared Database Detection** - Anti-pattern: multiple contexts sharing same database
- [ ] **Kafka Topic Analysis** - Event-driven relationships (not visible via REST APIs alone)
- [ ] **Shared Library Detection** - True SHARED_KERNEL vs just API dependencies
- [ ] **Anti-Pattern Detection** - Identify architectural violations
- [ ] **Frontend Visualization** - D3.js graph visualization component
- [ ] **Context Health Metrics** - Recommendations and health scores
- [ ] **BIAN Framework Integration** - Banking-specific context mapping
- [ ] **Context Evolution Tracking** - Historical analysis over time

See `CONTEXT_MAPPING_PLAN.md` for roadmap details.
