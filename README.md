### 2. Authentication Setup ✅ WORKING
GitHub authentication is fully configured and tested.

**Required Environment Variables:**
- `GITHUB_CLIENT_ID` - Your GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET` - Your GitHub OAuth App Client Secret
- `GITHUB_TOKEN` - Personal Access Token for GitHub integration

**Setup Instructions:**
1. Create a GitHub OAuth App at https://github.com/settings/developers
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:7007/api/auth/github/handler/frame`
2. Create a `.env` file in the project root with the credentials:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   GITHUB_TOKEN=your_github_personal_access_token
   ```
3. Start the app (environment variables are automatically loaded from `.env`):
   ```bash
   yarn start
   ```
4. Open http://localhost:3000 and sign in with GitHub

**Configuration Files:**
- Backend: `packages/backend/src/index.ts` - GitHub auth provider module added
- Frontend: `packages/app/src/App.tsx` - GitHub sign-in option configured
- Config: `app-config.yaml` - GitHub auth provider configuration under `auth.providers.github`
- Environment: `.env` - GitHub credentials (not committed to git)
- Start script: `package.json` - Auto-loads `.env` on `yarn start`

See the [Backstage GitHub Auth Provider docs](https://backstage.io/docs/auth/providers/github/) for more details.
# [Backstage](https://backstage.io)

This is your newly scaffolded Backstage App, Good Luck!

To start the app, run:

```sh
yarn install
yarn start
```

## Milestone 1 Progress

### 1. Core Plugins Setup
The Backstage app has been set up with the following core plugins:
- Catalog
- Search
- TechDocs
- API Docs
- Scaffolder
- Organization

You can find their imports and usage in `packages/app/src/App.tsx` and related components.

### 3. Database Setup (PostgreSQL) ✅ COMPLETE

Backstage is now using PostgreSQL for persistent data storage instead of in-memory SQLite.

**Database Architecture:**
- PostgreSQL 17.0 running in Docker container
- Backstage creates separate databases per plugin:
  - `backstage_plugin_catalog` - Catalog entities
  - `backstage_plugin_auth` - Authentication data
  - `backstage_plugin_scaffolder` - Templates and scaffolder data
  - And more for each plugin

**Required Environment Variables:**
Add these to your `.env` file:
```
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=backstage
```

**Setup Instructions:**
1. Start PostgreSQL using Docker Compose:
   ```bash
   docker compose -f docker-compose.local.yaml up -d
   ```
2. The database configuration is in `app-config.yaml`:
   ```yaml
   backend:
     database:
       client: pg
       connection:
         host: ${POSTGRES_HOST}
         port: ${POSTGRES_PORT}
         user: ${POSTGRES_USER}
         password: ${POSTGRES_PASSWORD}
         database: ${POSTGRES_DB}
   ```
3. Start Backstage (it will automatically run migrations and create plugin databases):
   ```bash
   yarn start
   ```

**Verification:**
You can verify data persistence by connecting to the catalog database:
```bash
docker exec -it backstage-postgres-1 psql -U postgres -d backstage_plugin_catalog
\dt  # List tables
SELECT entity_id, final_entity::jsonb->'metadata'->>'name' as name FROM final_entities;
```

**Configuration Files:**
- Docker Compose: `docker-compose.local.yaml` - PostgreSQL container definition
- Backend Config: `app-config.yaml` - Database connection settings
- Environment: `.env` - PostgreSQL credentials (not committed to git)
- Package: `packages/backend/package.json` - Includes `pg` PostgreSQL client

### 4. Milestones Complete

**Milestone 1 - Backstage App Setup ✅**
- Core plugins enabled (catalog, search, docs, etc.)
- GitHub authentication fully configured and working
- Example entities available from default Backstage app
- Software templates setup parked for phase 2

**Milestone 2 - Database Setup ✅**
- PostgreSQL configured and running in Docker
- All catalog data persisted in database
- Data survives backend restarts
- Verified with test entities

**See above for detailed setup instructions and configuration file locations.**

---

## Milestone 3: Custom Plugins 🎯

This Backstage instance includes custom-built plugins that provide foundational data ingestion and architectural analysis capabilities.

### 🔹 Foundational Plugins

#### 1. Static Data Backend Plugin

**Purpose**: GitHub-based catalog provider that automatically syncs entities from a static data repository.

**Key Features:**
- 📥 **Automated Entity Import**: Fetches applications, squads, bounded contexts, and domains from GitHub JSON files
- 🔗 **OpenAPI Discovery**: Automatically discovers API definitions from `contracts/` folder structure
- 🔧 **build.gradle Integration**: Intelligently parses build.gradle files to extract API producer/consumer relationships
- 📊 **Database Sync Tracking**: Maintains sync history with detailed statistics in PostgreSQL
- ⏰ **Scheduled Auto-Refresh**: Configurable automatic refresh (default: every 30 minutes)
- 🌐 **HTTP API**: Manual refresh endpoint and API relation query endpoints
- ✅ **Production Status**: Currently loading **62 entities** from static-data repository

**Quick Start:**
```yaml
# app-config.yaml
staticData:
  github:
    repo: ${STATIC_DATA_REPO}          # e.g., "myorg/static-data"
    branch: ${STATIC_DATA_BRANCH}      # e.g., "master"
    token: ${STATIC_DATA_GITHUB_TOKEN}
  
  schedule:
    frequency: '*/30 * * * *'  # Refresh every 30 minutes
```

**API Endpoints:**
```bash
# Manual refresh of all entities
curl -X POST http://localhost:7007/api/static-data/refresh

# Get API consumers for a specific API
curl http://localhost:7007/api/static-data/api-consumers/payment-gateway-api-v2

# Get all API producer/consumer relationships
curl http://localhost:7007/api/static-data/api-relations
```

**Entity Transformations:**
- `applications.json` → **Component** entities
- `squads.json` → **Group** entities  
- `bounded-contexts.json` → **Domain** entities
- OpenAPI contracts → **API** entities
- build.gradle analysis → `providesApis` / `consumesApis` relationships

**Documentation**: See [`plugins/static-data-backend/README.md`](plugins/static-data-backend/README.md) for comprehensive setup and API reference.

---

#### 2. Kafka Topology Plugins

**Purpose**: Interactive visualization of Kafka topic topologies across bounded contexts.

**Frontend Plugin** (`kafka-topology`):
- 🎨 **Interactive React Flow Visualization**: Multi-context topology graphs
- 📊 **Partition Display**: Shows partition counts with overflow handling
- 🔍 **Real-time Filtering**: Search and filter topics by name
- 🎯 **Three-Column Layout**: Uses Dagre algorithm for clear producer → topic → consumer separation
- 💅 **Modern UI**: Professional design with gradients and responsive layout

**Backend Plugin** (`kafka-topology-backend`):
- 🗄️ **PostgreSQL Storage**: Database-backed topology data
- 🔄 **GitHub Integration**: Fetches topic contracts from `contracts/{bounded-context}/topics.yaml`
- 🌐 **REST API**: `GET /kafka-topology` (retrieve data), `POST /kafka-topology/refresh` (sync from GitHub)
- ✅ **Production Status**: Currently loading **7 bounded contexts** (creditcards, deposits, iam, loan, onboarding, payments, customertransactions)

**Quick Start:**
```yaml
# app-config.yaml
integrations:
  kafkaTopology:
    githubOwner: "myorg"
    githubRepo: "static-data"
    githubBranch: "master"
    githubPath: "contracts"
    githubToken: ${GITHUB_TOKEN}
```

**Access:**
```bash
# Frontend visualization
http://localhost:3000/kafka-topology

# Backend API
curl http://localhost:7007/api/kafka-topology
curl -X POST http://localhost:7007/api/kafka-topology/refresh
```

**Documentation**: 
- Frontend: [`plugins/kafka-topology/README.md`](plugins/kafka-topology/README.md)
- Backend: [`plugins/kafka-topology-backend/README.md`](plugins/kafka-topology-backend/README.md)

---

### 🔹 Architectural Analysis Plugins

#### 3. Architecture Backend Plugin

**Purpose**: Domain-Driven Design (DDD) analysis and bounded context visualization using catalog data.

**Key Features:**
- 🏗️ **Bounded Context Discovery**: Automatically discovers bounded contexts from catalog domains
- 🔗 **Relationship Mapping**: Identifies and maps cross-context relationships (Upstream/Downstream, Shared Kernels, Published Language, etc.)
- 📊 **DDD Pattern Analysis**: Analyzes component dependencies and API contracts to determine strategic design patterns
- 🌐 **REST API**: 5 production-ready endpoints for programmatic access
- 🖥️ **Interactive Dashboard**: Live HTML viewer at `/api/architecture/viewer` with CSP-compliant security
- 🔗 **GitHub Integration**: Clickable links to component repositories
- ✅ **Production Status**: Currently analyzing **10 bounded contexts** with **10 cross-context relationships**

**Quick Start:**
```yaml
# No configuration needed - works with existing catalog data!
# Plugin automatically discovers contexts from Domain entities
```

**API Endpoints:**
```bash
# Get complete context map with all relationships
curl http://localhost:7007/api/architecture/context-map

# Get list of all bounded contexts
curl http://localhost:7007/api/architecture/contexts

# Get relationships for a specific context
curl http://localhost:7007/api/architecture/contexts/payment-core/relationships

# Get all relationships across contexts
curl http://localhost:7007/api/architecture/relationships

# Health check
curl http://localhost:7007/api/architecture/health
```

**Interactive Dashboard:**
```bash
# Live visualization dashboard (CSP-compliant)
http://localhost:7007/api/architecture/viewer
```

![Architecture Dashboard](docs/screenshots/architecture-dashboard.png)
*Live dashboard showing bounded contexts and their relationships*

**DDD Patterns Detected:**
- **Upstream/Downstream**: Component dependencies with clear direction
- **Shared Kernel**: Shared APIs used by multiple contexts
- **Published Language**: Well-defined API contracts
- **Customer/Supplier**: Service consumption patterns
- **Conformist**: Downstream context conforming to upstream API

**How It Works:**
1. Static-data plugin loads catalog entities (components, APIs, domains)
2. Architecture plugin queries the catalog to discover bounded contexts
3. Analyzes `providesApis` and `consumesApis` relationships
4. Maps cross-context dependencies to DDD patterns
5. Exposes results via REST API and interactive dashboard

**Documentation**: See [`plugins/architecture-backend/README.md`](plugins/architecture-backend/README.md) for detailed API reference and DDD pattern documentation.

---

### 📸 Screenshots

#### Static Data Import
![Static Data Entities](docs/screenshots/static-data-entities.png)
*62 entities automatically imported from GitHub repository*

#### Architecture Context Map
![Architecture Context Map](docs/screenshots/architecture-context-map.png)
*10 bounded contexts with relationship types (Upstream/Downstream, Shared Kernel)*

#### Kafka Topology Visualization
![Kafka Topology](docs/screenshots/kafka-topology.png)
*Interactive visualization of 7 bounded contexts with Kafka topics and producers/consumers*

---

### 🔮 Future Enhancements

#### Architecture Plugin - Phase 5+

**Advanced Relationship Discovery:**
- [ ] **Event-Driven Patterns**: Detect event producer/consumer relationships from Avro schemas
- [ ] **Anti-Corruption Layer (ACL)**: Identify translation layers between contexts
- [ ] **Open Host Service**: Detect public API gateways and external integrations
- [ ] **Partnership**: Identify mutual dependencies and collaborative contexts
- [ ] **Big Ball of Mud**: Detect tightly coupled components lacking clear boundaries

**Dependency Analysis:**
- [ ] **Transitive Dependencies**: Track indirect relationships (A→B→C chains)
- [ ] **Circular Dependency Detection**: Identify and flag problematic cycles
- [ ] **Dependency Health Score**: Rate relationship quality based on coupling metrics
- [ ] **Breaking Change Impact**: Predict blast radius of API changes

**Visualization Enhancements:**
- [ ] **Interactive Graph Editor**: Drag-and-drop context positioning
- [ ] **Relationship Strength Indicators**: Visual weight based on call volume/frequency
- [ ] **Time-based Evolution View**: Animate how architecture evolved over time
- [ ] **Export Options**: Generate SVG/PNG diagrams, PlantUML, or C4 model diagrams

**Integration & Intelligence:**
- [ ] **OpenTelemetry Integration**: Correlate runtime traces with architectural relationships
- [ ] **SonarQube Integration**: Map code quality metrics to bounded contexts
- [ ] **Confluence Export**: Auto-generate architecture documentation
- [ ] **Slack Notifications**: Alert on new relationships or breaking changes
- [ ] **AI-Powered Suggestions**: Recommend refactoring opportunities and pattern improvements

**Database & Historical Analysis:**
- [ ] **Relationship History Tracking**: Store snapshots of architecture over time
- [ ] **Change Auditing**: Track who made changes and when
- [ ] **Migration Planning**: Suggest decomposition strategies for monoliths
- [ ] **Tech Debt Scoring**: Quantify architectural complexity and coupling

#### Static Data Plugin - Phase 2+

**Enhancements from Plugin README:**
- [ ] **Avro Schema Relations**: Extract event producer/consumer from `avro { ... }` blocks
- [ ] **Event Entity Type**: Create Event entities and link via `publishesEvents`/`consumesEvents`
- [ ] **Internal Dependencies**: Extract `project(':module')` dependencies from build.gradle
- [ ] **Database/Infrastructure**: Parse database and Kafka topic configurations
- [ ] **Technology Stack**: Extract framework and library versions
- [ ] **Build Configuration**: Docker images, versions, registry information
- [ ] **Quality Metrics**: Test coverage, SonarQube integration
- [ ] **Service Metadata**: Ports, health checks, metrics endpoints

#### BIAN Framework Integration (Ambitious Vision) 🌟

**Goal**: Automatically map microservices to BIAN (Banking Industry Architecture Network) Service Domains for banking-specific architectural governance.

**Complete DDD/BIAN Context Mapping System:**

**Multi-Source Analysis:**
- [ ] **application.yml Parsing**: 
  - Extract database connections to detect shared database anti-patterns
  - Parse Kafka configurations for event-driven patterns
  - Identify external service integrations
  - Map infrastructure dependencies
  
- [ ] **Kotlin Source Code Analysis**:
  - Parse `@KafkaListener` annotations for event consumers
  - Extract event topic constants and producers
  - Discover gRPC service definitions
  - Map REST controller endpoints
  - Detect shared internal models

- [ ] **docker-compose.yml Analysis**:
  - Service deployment dependencies
  - Shared infrastructure patterns
  - Network topology mapping
  - Container orchestration insights

- [ ] **README.md Extraction**:
  - Integration documentation parsing
  - API contract specifications
  - Event schema documentation
  - Design intent and architectural decisions

**BIAN Service Domain Mapping:**
- [ ] Automatic classification of bounded contexts to BIAN Service Domains
- [ ] BIAN maturity assessment scoring
- [ ] Banking-specific pattern compliance checking
- [ ] Service domain coverage analysis

**Advanced Anti-Pattern Detection:**
- [ ] **Shared Database Detection**: Flag database connections shared across contexts
- [ ] **Tight Coupling Indicators**: Analyze excessive dependencies
- [ ] **Circular Dependency Detection**: Identify problematic dependency cycles
- [ ] **Database-per-Service Compliance**: Validate microservice data isolation

**Event-Driven Architecture Analysis:**
- [ ] Complete Kafka topic producer/consumer graph
- [ ] Event flow visualization across bounded contexts
- [ ] Event schema compatibility tracking
- [ ] Async vs sync communication patterns

**Shared Kernel Analysis:**
- [ ] Internal library dependency tracking
- [ ] Shared model detection and versioning
- [ ] Technology stack alignment analysis
- [ ] Framework version compatibility

**Interactive Visualization:**
- [ ] D3.js/React Flow context map diagrams
- [ ] Zoom/pan for large enterprise architectures
- [ ] Filter by pattern type, service domain, or team
- [ ] Time-based evolution animations
- [ ] Export to C4, PlantUML, or Structurizr formats

**Governance & Compliance:**
- [ ] Automated DDD/BIAN pattern compliance checks
- [ ] Architecture quality scoring
- [ ] Deviation alerts and recommendations
- [ ] Policy enforcement rules engine

**Vision Statement**: *Build an intelligent system that automatically analyzes Kotlin microservice repositories to generate comprehensive bounded context maps, detect architectural anti-patterns, and visualize the complete enterprise architecture landscape aligned with DDD and BIAN principles.*

**Documentation**: See [`plugins/static-data-backend/VISION_AND_ROADMAP.md`](plugins/static-data-backend/VISION_AND_ROADMAP.md) for complete roadmap and technical specifications.

---

### 🚀 Quick Access URLs

```bash
# Architecture Dashboard (Interactive Viewer)
http://localhost:7007/api/architecture/viewer

# Architecture REST API
http://localhost:7007/api/architecture/context-map
http://localhost:7007/api/architecture/contexts

# Static Data API (Entity Relations)
http://localhost:7007/api/static-data/api-relations
http://localhost:7007/api/static-data/refresh

# Kafka Topology Visualization
http://localhost:3000/kafka-topology

# Kafka Topology Backend API
http://localhost:7007/api/kafka-topology
```

---

### 🔗 Plugin Interaction Flow

```
┌─────────────────────────────────────┐
│   Static Data Plugin (Foundation)   │
│  • Loads 62 entities from GitHub    │
│  • Parses build.gradle for APIs     │
│  • Discovers OpenAPI contracts      │
└──────────────┬──────────────────────┘
               │ Provides catalog entities
               ↓
    ┌──────────┴─────────────┐
    │                        │
    ↓                        ↓
┌───────────────────┐  ┌──────────────────────┐
│ Architecture      │  │ Kafka Topology       │
│ • DDD Analysis    │  │ • Event Flows        │
│ • 10 Contexts     │  │ • 7 Bounded Contexts │
│ • 10 Relations    │  │ • Topic Visualization│
└───────────────────┘  └──────────────────────┘
```

---

### 📊 Custom Development Summary

- **Backend Plugins**: 3 (static-data, architecture, kafka-topology)
- **Frontend Plugins**: 1 (kafka-topology UI)
- **Total Entities Managed**: 62 (from static-data)
- **Bounded Contexts Discovered**: 10 (from architecture analysis)
- **Kafka Contexts Visualized**: 7 (from kafka-topology)
- **All Plugins**: Production-ready with comprehensive documentation

---
