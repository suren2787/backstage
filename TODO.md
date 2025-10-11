
# Backstage Project Milestones & Action Items
## Immediate Action Items (as of 2025-10-11)

 
# Consolidated TODOs (as of 2025-10-11)

- [ ] Fix the static-data refresh button UX so it’s visible and working in the UI
- [ ] Add manual refresh button to Backstage UI (trigger /api/static-data/refresh)
- [ ] Display last sync time in Backstage UI (update after each refresh)
- [ ] Add sidebar navigation entries for BIAN entities (Domain, System, Component, etc.)
- [ ] Integrate Kafka topology into Backstage
- [ ] Create new BIAN entities (landscape diagrams, references, etc.)



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

## Milestone 3: Custom Entity Provider for static-data Repository ✅ IN PROGRESS
**Goal**: Import and sync entities from private static-data repository (squads, bounded contexts, applications)

**Data Sources:**
- Private GitHub repo: `suren2787/static-data` ✅
- JSON files: `data/squads.json`, `data/bounded-contexts.json`, `data/applications.json` ✅
- Update frequency: ~once per day (manual trigger for now)
- Volume: 2 squads, 2 bounded contexts, 2 applications (sample data) ✅


**Entity Mapping:**
- Squads → Backstage `Group` entities ✅
- Bounded Contexts → Backstage `Domain` entities ✅
- Applications → Backstage `Component` entities ✅

### Backend Plugin Development ✅ COMPLETE
- [x] Create backend plugin: `@suren/static-data-backend`
  - [x] Set up plugin structure at `plugins/static-data-backend/` ✅
  - [x] Implemented GitHub API client using `@octokit/rest` ✅
  - [x] Created TypeScript transformers (applicationToComponent, squadToGroup, boundedContextToDomain) ✅
  - [x] Added AJV JSON schema validation ✅
  - [x] Exposed manual refresh API endpoint (`POST /api/static-data/refresh`) ✅
  - [x] Added error handling and logging ✅
  - [x] Successfully tested with sample data (6 entities imported) ✅

**Plugin Structure:**
```
plugins/static-data-backend/
├── package.json (name: @suren/static-data-backend)
├── tsconfig.json
└── src/
    ├── index.ts        # Plugin registration using createBackendPlugin
    ├── router.ts       # Express router with /refresh endpoint
    ├── provider.ts     # StaticDataProvider class with refresh() logic
    ├── fetcher.ts      # GitHub file fetching with Octokit
    ├── schemas.ts      # AJV validation schemas
    └── transformer.ts  # JSON → Backstage entity mappers
```

### Backend Integration ✅ COMPLETE
- [x] Registered plugin in `packages/backend/src/index.ts` ✅
- [x] Added environment variables to `.env`: ✅
  - `STATIC_DATA_GITHUB_TOKEN=ghp_...` (Personal Access Token with repo scope)
  - `STATIC_DATA_REPO=suren2787/static-data`
  - `STATIC_DATA_BRANCH=master`
  - `STATIC_DATA_WRITE=true` (writes to `static-data-out/entities-*.json`)
- [x] Plugin successfully loads and initializes ✅
- [x] API endpoint working: `POST http://localhost:7007/api/static-data/refresh` ✅
- [x] Tested with curl - returns `{"imported": 6, "errors": []}` ✅
- [x] Entities written to file at `packages/backend/static-data-out/entities-{timestamp}.json` ✅


### Next Steps (Phase 2)
- [ ] **Configuration via app-config.yaml**:
  ```yaml
  staticData:
    github:
      repo: ${STATIC_DATA_REPO}
      branch: ${STATIC_DATA_BRANCH}
      token: ${STATIC_DATA_GITHUB_TOKEN}
    files:
      squads: 'data/squads.json'
      boundedContexts: 'data/bounded-contexts.json'
      applications: 'data/applications.json'
    refresh:
      enabled: true
      schedule: '0 */6 * * *'  # Every 6 hours
  ```

- [ ] **Scheduled Auto-Refresh**:
  - [ ] Implement cron scheduling with node-cron
  - [ ] Make schedule configurable via app-config
  - [ ] Add option to disable auto-refresh
  - [ ] Log scheduled refresh results

- [ ] **Enhanced Error Handling**:
  - [ ] Retry logic for transient GitHub API failures
  - [ ] Rate limit detection and backoff
  - [ ] Detailed validation error messages per entity
  - [ ] Alerting/notifications on repeated failures

- [ ] **Testing**:
  - [ ] Unit tests for schemas, transformers, provider
  - [ ] Integration tests for GitHub fetcher
  - [ ] E2E test for full refresh flow
  - [ ] Test with full production data volume (~250 apps)

- [ ] **Documentation**:
  - [ ] Update README with plugin usage
  - [ ] Document environment variables
  - [ ] Add troubleshooting guide
  - [ ] Document entity mapping details
  - [ ] Add architecture diagram

## Milestone 4: Integrate Kafka-Topology Plugin
- [ ] Review your existing Kafka-topology plugin
- [ ] Integrate it into the Backstage app
- [ ] Test and document the integration
