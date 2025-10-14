# Architecture Backend Plugin

A Backstage backend plugin for discovering and visualizing bounded contexts based on Domain-Driven Design (DDD) principles.

## Features

- **Bounded Context Discovery**: Automatically discovers bounded contexts from your Backstage catalog
- **Context Mapping**: Identifies relationships between contexts using DDD patterns
- **API Dependency Analysis**: Maps API relationships to context boundaries
- **GitHub Integration**: References component source code from applications.yaml or catalog metadata

## Installation

1. Add the plugin to your backend:

```bash
cd packages/backend
yarn add @suren/architecture-backend
```

2. Register the plugin in `packages/backend/src/index.ts`:

```typescript
backend.add(import('../../plugins/architecture-backend/src/index'));
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

1. **Context Discovery**: Groups components by system/domain from Backstage catalog
2. **API Analysis**: Examines `providesApis` and `consumesApis` relationships
3. **GitHub Integration**: Extracts source URLs from component metadata
4. **Relationship Inference**: Determines DDD patterns based on API types and domain grouping

## Configuration

No additional configuration required. The plugin uses:
- Backstage's catalog API for component/API discovery
- Component metadata for GitHub URLs
- Existing API relationship data from static-data plugin

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

## Future Enhancements

- [ ] Frontend visualization component with D3.js graph
- [ ] Context health metrics and recommendations
- [ ] Integration with BIAN framework for banking contexts
- [ ] Support for explicit context boundary definitions
- [ ] Context evolution tracking over time
