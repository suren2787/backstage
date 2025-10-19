# Backstage with Architecture & Kafka Plugins

A Backstage instance with custom plugins for DDD/Architecture analysis and Kafka topology visualization.

## Quick Start

```bash
# Install dependencies
yarn install

# Start the application (frontend + backend)
yarn start
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:7007

## Repository Structure

```
backstage/
├── packages/
│   ├── app/                    # Frontend React application
│   └── backend/                # Backend Node.js/Express server
├── plugins/
│   ├── plugin-architecture/    # Architecture diagram plugin (frontend)
│   ├── architecture-backend/   # DDD analysis plugin (backend)
│   ├── kafka-topology/         # Kafka visualization plugin (frontend)
│   ├── kafka-topology-backend/ # Kafka API plugin (backend)
│   ├── static-data-backend/    # Entity ingestion plugin (backend)
│   └── README.md               # Plugin registry
├── app-config.yaml             # Main configuration
└── docker-compose.local.yaml   # PostgreSQL for catalog
```

## Core Plugins

### 1. **Static Data Backend Plugin**
Ingests catalog entities from a GitHub repository.

- 📥 Automatic entity import from GitHub
- 🔗 OpenAPI/API discovery from contract files
- � Architecture metadata extraction
- ⏰ Manual & scheduled refresh

**Status**: 62 entities loaded | [📖 Details](plugins/static-data-backend/README.md)

### 2. **Architecture Backend Plugin**
Analyzes DDD bounded contexts and visualizes relationships.

- 🏗️ Bounded context discovery
- 🔗 Cross-context relationship mapping
- 📊 DDD pattern analysis
- 🎨 Interactive visualization API

**Status**: 10 bounded contexts | [📖 Details](plugins/architecture-backend/README.md)

### 3. **Kafka Topology Plugins**
Visualizes Kafka topics and producer/consumer relationships.

- 🎨 Interactive React Flow visualization
- 📊 Producer/consumer mapping
- 🔍 Real-time filtering
- 🌐 REST API

**Status**: 7 bounded contexts with Kafka | [📖 Frontend](plugins/kafka-topology/README.md) | [📖 Backend](plugins/kafka-topology-backend/README.md)

## Key Endpoints

| Feature | URL |
|---------|-----|
| Catalog | http://localhost:3000/catalog |
| Kafka Topology | http://localhost:3000/kafka-topology |
| Architecture Diagram | http://localhost:3000/architecture/diagram |
| Architecture API | http://localhost:7007/api/architecture/context-map |
| Kafka API | http://localhost:7007/api/kafka-topology |

## Documentation

- **[MAINTAINERS.md](MAINTAINERS.md)** - Development guide, testing, debugging
- **[TODO.md](TODO.md)** - Project roadmap and milestones
- **[plugins/README.md](plugins/README.md)** - Plugin overview
- **[plugins/architecture-backend/README.md](plugins/architecture-backend/README.md)** - DDD analysis details
- **[plugins/static-data-backend/README.md](plugins/static-data-backend/README.md)** - Entity ingestion
- **[plugins/kafka-topology-backend/README.md](plugins/kafka-topology-backend/README.md)** - Kafka API
- **[plugins/kafka-topology/README.md](plugins/kafka-topology/README.md)** - Kafka UI

## Technology Stack

- **Frontend**: React, Material-UI, React Flow (diagrams)
- **Backend**: Node.js, Express, Fastify
- **Database**: PostgreSQL
- **Data**: GitHub API integration, OpenAPI/Swagger contracts

## Contributing

See [MAINTAINERS.md](MAINTAINERS.md) for development setup and contribution guidelines.
