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
