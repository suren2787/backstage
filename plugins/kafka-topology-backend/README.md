# Kafka Topology Backend Plugin

This backend plugin provides API endpoints to serve and refresh Kafka Topology data from a database. Data is loaded from GitHub on refresh and always served from the DB (no local fallback).

## Endpoints
- `GET /kafka-topology` — Get all Kafka topology data from the DB
- `POST /kafka-topology/refresh` — Fetch from GitHub, update the DB

## DB Table
- `kafka_topology` with columns: id, context, topics (jsonb), source, path, updated_at

## Migration
Run the migration in `src/migrations/20251012_create_kafka_topology_table.js` to create the table.

## Configuration
Add the following to your `app-config.yaml`:

```yaml
integrations:
  kafkaTopology:
    githubOwner: <owner>
    githubRepo: <repo>
    githubBranch: <branch>
    githubPath: <path>
    githubToken: <token>
```

## Usage
- The frontend should call these endpoints instead of using local/mock data.
- On refresh, the backend fetches from GitHub and updates the DB.
