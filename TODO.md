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

## Milestone 2: Database Setup for Catalog Entities
- [ ] Configure a persistent database (e.g., PostgreSQL) for the Backstage catalog
- [ ] Update `app-config.yaml` to use the database
- [ ] Migrate catalog data to the new DB and verify persistence

## Milestone 3: Custom Entity Plugin for Your Common Repo
- [ ] Analyze your GitHub repo structure (bounded contexts, microservices, etc.)
- [ ] Design a custom Backstage entity plugin to ingest and model this data
- [ ] Implement regular data refresh (scheduled sync or webhook)
- [ ] Validate that entities appear and update in Backstage

## Milestone 4: Integrate Kafka-Topology Plugin
- [ ] Review your existing Kafka-topology plugin
- [ ] Integrate it into the Backstage app
- [ ] Test and document the integration
