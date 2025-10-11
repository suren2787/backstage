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

### 3. Milestone 1 Complete

**Backstage app setup is complete and tested.**

- Core plugins enabled (catalog, search, docs, etc.)
- GitHub authentication fully configured and working
- Example entities available from default Backstage app
- Software templates setup parked for phase 2

**See above for detailed setup instructions and configuration file locations.**
