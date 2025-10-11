# Backstage Project Milestones

## Milestone 1: Backstage App Setup
- [x] Set up Backstage app with core plugins (catalog, search, docs, etc.)
	- Core plugins are present in `packages/app/src/App.tsx` and related components.
- [x] Configure authentication (GitHub enabled) ✅ TESTED & WORKING
	- Backend: GitHub auth provider module added to `packages/backend/src/index.ts`
	- Frontend: GitHub sign-in option configured in `packages/app/src/App.tsx`
	- Config: Environment variables set in `.env` and referenced in `app-config.yaml`
	- App start script updated to auto-load `.env` variables
- [x] Add example entities to the catalog (users, groups, systems, components) — skipped (default Backstage examples already present)
- [ ] Set up software templates for onboarding — parked for phase 2
- [x] Document the setup process in the README

## Milestone 2: Database Setup for Catalog Entities ✅ COMPLETE
- [x] Configure a persistent database (PostgreSQL via Docker Compose) for the Backstage catalog
	- Created `docker-compose.local.yaml` with PostgreSQL 17.0
	- PostgreSQL credentials stored in `.env` file (not committed)
	- Docker Compose configured to use environment variables for security
- [x] Update `app-config.yaml` to use the database
	- Changed database client from `better-sqlite3` to `pg`
	- Configured connection using environment variables: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
	- Installed `pg` package in backend workspace
- [x] Migrate catalog data to the new DB and verify persistence ✅ VERIFIED
	- Backstage creates separate databases per plugin (e.g., `backstage_plugin_catalog`, `backstage_plugin_auth`)
	- Catalog entities stored in `backstage_plugin_catalog` database in `final_entities` table
	- Tested with `demo-service` entity - successfully persisted and queried from PostgreSQL
	- Data survives backend restarts

## Milestone 3: Custom Entity Provider for static-data Repository
**Goal**: Import and sync entities from private static-data repository (squads, bounded contexts, applications)

**Data Sources:**
- Private GitHub repo: `static-data`
- JSON files: `data/squads.json`, `data/bounded-contexts.json`, `data/applications.json`
- Update frequency: ~once per day
- Volume: ~15 squads, ~35 bounded contexts, ~250 applications

**Entity Mapping:**
- Squads → Backstage `Group` entities
- Bounded Contexts → Backstage `Domain` entities
- Applications → Backstage `Component` entities

### Backend Plugin Development
- [ ] Create backend plugin: `backstage-plugin-static-data-backend`
  - [ ] Set up plugin structure and dependencies
  - [ ] Implement GitHub API client for private repo access (using GitHub token)
  - [ ] Port Python transformation logic to TypeScript
  - [ ] Add JSON schema validation before processing
  - [ ] Create entity provider with configurable scheduled refresh
  - [ ] Expose manual refresh API endpoint (`POST /api/static-data/refresh`)
  - [ ] Add error handling for GitHub API failures and invalid JSON
  - [ ] Make all settings configurable via `app-config.yaml`:
    - Refresh schedule/interval (e.g., every 15 minutes)
    - GitHub repository URL
    - GitHub branch (e.g., main, master)
    - JSON file paths (squads.json, bounded-contexts.json, applications.json)
    - Enable/disable automatic refresh
    - Enable/disable manual refresh endpoint
    - Timeout settings for GitHub API calls
    - Entity naming conventions and prefixes

### Backend Integration
- [ ] Integrate entity provider with Backstage backend
  - [ ] Register provider in `packages/backend/src/index.ts`
  - [ ] Add GitHub access token to `.env` (STATIC_DATA_GITHUB_TOKEN)
  - [ ] Configure all settings in `app-config.yaml`:
    ```yaml
    staticData:
      github:
        repo: 'owner/static-data'
        branch: 'main'
        token: ${STATIC_DATA_GITHUB_TOKEN}
      files:
        squads: 'data/squads.json'
        boundedContexts: 'data/bounded-contexts.json'
        applications: 'data/applications.json'
      refresh:
        enabled: true
        schedule: '*/15 * * * *'  # Every 15 minutes (cron format)
        timeout: 30000  # 30 seconds
      manualRefresh:
        enabled: true
    ```
  - [ ] Test automatic refresh on schedule
  - [ ] Test configuration changes (different intervals, file paths)
  - [ ] Verify entities appear in catalog database

### Frontend UI Development
- [ ] Create frontend UI for manual refresh
  - [ ] Add "Refresh Static Data" button to catalog or admin page
  - [ ] Display last sync time and status
  - [ ] Show entity counts (squads, bounded contexts, applications)
  - [ ] Handle loading states and error messages
  - [ ] Add confirmation dialog for manual refresh

### Testing and Verification
- [ ] Test entity imports
  - [ ] Verify all squads imported as Group entities
  - [ ] Verify all bounded contexts imported as Domain entities
  - [ ] Verify all applications imported as Component entities
  - [ ] Verify relationships: squads own bounded contexts, apps belong to contexts
  - [ ] Verify GitHub team annotations on squads
- [ ] Test refresh functionality
  - [ ] Test manual refresh via UI button
  - [ ] Verify automatic refresh works on schedule
  - [ ] Test error handling (invalid JSON, GitHub API rate limits, network failures)
  - [ ] Test incremental updates (add/modify/delete entities)

### Documentation
- [ ] Document the integration
  - [ ] Update README with static-data integration details
  - [ ] Document entity mapping (JSON structure → Backstage entities)
  - [ ] Add setup instructions for GitHub token and configuration
  - [ ] Document manual refresh feature
  - [ ] Add troubleshooting guide for common issues

## Milestone 4: Integrate Kafka-Topology Plugin
- [ ] Review your existing Kafka-topology plugin
- [ ] Integrate it into the Backstage app
- [ ] Test and document the integration
