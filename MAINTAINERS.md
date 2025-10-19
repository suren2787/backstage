# Maintainers Guide

Development, testing, and deployment guide for Backstage architecture plugins.

## Quick Start

```bash
# Install dependencies
yarn install

# Start the application (frontend + backend)
yarn start

# Run in separate terminals
yarn workspace backend start    # Backend on localhost:7007
yarn workspace app start        # Frontend on localhost:3000
```

## Environment Setup

### Required Variables

```bash
# Backend Database (Backstage catalog)
BACKSTAGE_DATABASE_MANAGER=postgres
BACKSTAGE_DATABASE_HOST=localhost
BACKSTAGE_DATABASE_PORT=5432
BACKSTAGE_DATABASE_USER=backstage
BACKSTAGE_DATABASE_PASSWORD=backstage

# GitHub Integration (Optional - for static-data)
STATIC_DATA_GITHUB_TOKEN=ghp_xxxxxxxxxxxx
STATIC_DATA_REPO=myorg/static-data
STATIC_DATA_BRANCH=main
```

### Development Setup

```bash
# Create .env.development.local in packages/app
REACT_APP_BACKEND_URL=http://localhost:7007

# Backend can use mock data for testing
export ARCHITECTURE_USE_MOCK_DATA=true
yarn workspace backend start
```

## Architecture Plugins

### Plugin Architecture

**Location**: `plugins/plugin-architecture/`

**Features**:
- Interactive React Flow diagram of bounded contexts
- Real-time relationship visualization
- Search and filter by context
- Click-to-details sidebar

**Technology**: React, React Flow, Material-UI v4, Dagre layout engine

**Key Files**:
- `src/components/ArchitectureDiagramPage.tsx` - Main diagram component
- `src/adapter.ts` - Backend data transformation
- `src/layout.ts` - Dagre graph layout + edge styling
- `src/plugin.tsx` - Plugin registration

**Testing**:
```bash
# Start the app to see the plugin at /architecture/diagram
yarn start
```

### Architecture Backend Plugin

**Location**: `plugins/architecture-backend/`

**Features**:
- Discovers bounded contexts from Backstage catalog
- Infers API relationships and dependencies
- REST API for context mapping
- DDD pattern classification

**Technology**: Node.js, Express, Knex (database)

**API Endpoints**:
- `GET /api/architecture/health` - Health check
- `GET /api/architecture/context-map` - Full context map with relationships
- `GET /api/architecture/contexts` - List all bounded contexts
- `GET /api/architecture/contexts/:id` - Get specific context
- `GET /api/architecture/contexts/:id/dependencies` - Get context dependencies

**Data Model**:
- **Bounded Context** = Backstage `System` entity
- **Microservice** = Backstage `Component` with `spec.system`
- **APIs** = Extracted from `providesApis` and `consumesApis`
- **Relationships** = Inferred from cross-context API dependencies

**Key Principle**:
```
spec.system = Bounded Context ID (the key field)
Each Component belongs to exactly ONE spec.system
Multiple Components can share the same spec.system
```

**Mock Data for Testing**:
```bash
export ARCHITECTURE_USE_MOCK_DATA=true
yarn workspace backend start
```

Loads 23 test entities including 10 bounded contexts with 10 relationships.

### Static Data Backend Plugin

**Location**: `plugins/static-data-backend/`

**Features**:
- Ingests catalog entities from GitHub static-data repository
- Parses `build.gradle` files for API producer/consumer relationships
- Scheduled refresh with cron expressions
- API consumer/provider discovery

**Technology**: Node.js, Express, GitHub API

**API Endpoints**:
- `POST /api/static-data/refresh` - Trigger manual refresh
- `GET /api/static-data/api-consumers/{api-name}` - List consumers
- `GET /api/static-data/api-providers/{api-name}` - List providers
- `GET /api/static-data/api-relations` - All producer/consumer relationships

**Configuration** (in `app-config.yaml`):
```yaml
staticData:
  github:
    repo: myorg/static-data
    branch: main
    token: ${STATIC_DATA_GITHUB_TOKEN}
  schedule:
    frequency: '*/30 * * * *'  # Every 30 minutes
```

**Data Sources**:
- `data/applications.json` - Components and their repos
- `data/squads.json` - Teams/owners
- `data/bounded-contexts.json` - Systems/domains
- `contracts/` - OpenAPI definitions
- `build.gradle` in each component repo - API relations

### Kafka Topology Plugin

**Location**: `plugins/kafka-topology/`

**Features**:
- Interactive Kafka topics visualization
- Producer/consumer discovery
- Topic detail sidebar

**Status**: Stable, self-contained plugin

## Testing Strategy

### Unit Tests

```bash
# Architecture backend
yarn workspace architecture-backend test

# Static-data backend
yarn workspace static-data-backend test

# Plugin
yarn workspace plugin-architecture test
```

### Integration Tests

```bash
# Start backend with mock data
export ARCHITECTURE_USE_MOCK_DATA=true
yarn workspace backend start

# In another terminal, verify endpoints
curl http://localhost:7007/api/architecture/context-map
curl http://localhost:7007/api/static-data/api-relations
```

### End-to-End Testing

```bash
# Full app stack (frontend + backend)
yarn start

# Navigate to http://localhost:3000
# Test: /architecture/diagram
# Test: /kafka-topology
# Test: /catalog (browse entities)
```

### Manual Testing Checklist

- [ ] **Architecture Diagram**: All 10 bounded contexts render
- [ ] **Bidirectional Edges**: Card Issuing ↔ Payment Core shows curved edges
- [ ] **Search/Filter**: Search for "order" → shows Order Core + related contexts
- [ ] **Click Details**: Click Order Core → side panel shows components and APIs
- [ ] **Clear Filter**: Clear search → returns to full diagram view
- [ ] **Kafka Topology**: All topics visible, producers/consumers correct
- [ ] **Catalog**: Browse components, verify `spec.system` field present

## Debugging

### Common Issues

**Issue**: `Cannot fetch /api/architecture/context-map`
- **Cause**: Backend proxy not configured or backend not running
- **Fix**: Ensure `app-config.yaml` has `/api/architecture` → `http://localhost:7007` proxy
- **Or**: Set `REACT_APP_BACKEND_URL=http://localhost:7007` in frontend

**Issue**: Only some bounded contexts showing in diagram
- **Cause**: Components missing `spec.system` field
- **Fix**: Verify all entities have `spec.system` in catalog

**Issue**: Bidirectional edges showing as straight lines
- **Cause**: Edge IDs not preserved through filtering
- **Fix**: Ensure `adapter.ts` uses backend `rel.id`, not index-based IDs

**Issue**: `arch-backend` failing to start
- **Cause**: Database credentials missing or incorrect
- **Fix**: Verify `BACKSTAGE_DATABASE_*` environment variables

### Debug Logging

**Enable verbose logging**:
```bash
DEBUG=* yarn workspace backend start
```

**Check specific endpoint**:
```bash
curl -v http://localhost:7007/api/architecture/contexts | jq '.'
```

**Database verification**:
```bash
# Connect to Backstage catalog database
psql -h localhost -U backstage -d backstage
SELECT COUNT(*) FROM final_entities WHERE kind='Component';
```

## Documentation

### Key Docs

1. **README.md** (Root)
   - Project overview
   - Quick start instructions
   - Architecture decisions

2. **plugins/architecture-backend/README.md**
   - Backend features and API reference
   - Data model and bounded context mapping
   - Configuration options

3. **plugins/static-data-backend/README.md**
   - Static data ingestion process
   - build.gradle parsing details
   - API consumer/provider discovery

4. **This file (MAINTAINERS.md)**
   - Development setup
   - Testing procedures
   - Common issues and debugging

### Updating Documentation

When making changes:
1. Update relevant README or inline comments
2. Update this MAINTAINERS.md if it affects development
3. Add CHANGELOG entries for user-facing changes
4. Keep examples current with actual code

## Code Quality

### Linting

```bash
# Check all packages
yarn lint

# Fix auto-fixable issues
yarn lint --fix
```

### Type Checking

```bash
# TypeScript compilation check
yarn tsc --noEmit
```

### Building

```bash
# Build all packages
yarn build

# Build specific package
yarn workspace plugin-architecture build
```

## Release Process

1. **Version Bump**
   - Update version in affected `package.json` files
   - Create git tag: `v1.0.0`

2. **Build & Test**
   ```bash
   yarn build
   yarn test
   ```

3. **Deploy**
   - Push to production branch
   - Trigger CI/CD pipeline
   - Verify in production environment

## Performance Optimization

### Frontend Optimization

- React Flow renders only visible nodes (virtualization)
- Dagre layout calculates positions client-side (reduces network calls)
- Edge IDs are stable to prevent re-renders

### Backend Optimization

- Direct database queries (no ORM overhead)
- Caches relationship map in memory
- Scheduled refresh prevents concurrent updates

### Common Bottlenecks

**Slow diagram rendering**:
- Check if Dagre layout is recalculating unnecessarily
- Verify edge count is < 50 (hard limit for smoothstep edges)

**Slow API responses**:
- Check database connection pool size
- Verify no N+1 queries in entity loading
- Monitor `final_entities` table size

## Contributing

### Adding a New Feature

1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement feature with tests
3. Update documentation
4. Submit PR with description of changes
5. Request review from maintainers

### Code Style

- Use TypeScript for type safety
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Keep components focused and composable

### Commit Messages

```
feat: Add bidirectional edge detection for architecture diagram
fix: Correct bidirectional edge styling in filtered view
docs: Update architecture diagram search behavior
chore: Clean up unused imports
```

## Resources

- [Backstage Documentation](https://backstage.io/docs)
- [React Flow Documentation](https://reactflow.dev)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [DDD Context Mapping Patterns](https://martinfowler.com/bliki/BoundedContext.html)

## Contact & Questions

For issues or questions:
1. Check existing issues in repository
2. Review this MAINTAINERS.md and README files
3. Create a new issue with detailed description
4. Reach out to maintainers on Slack/Teams
