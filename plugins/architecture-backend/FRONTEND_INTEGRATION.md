# Frontend Integration Options

## Current State

**Viewer Available:**
- ✅ Standalone HTML viewer (`viewer.html`)
- ✅ Works with any browser
- ✅ Auto-refreshes from backend API
- ✅ No installation needed

**Location:** `plugins/architecture-backend/viewer.html`

## Future: Backstage UI Integration

To integrate into Backstage's frontend, you have 3 options:

### Option 1: Simple Tab in Catalog (Easiest)

Add a custom tab to existing catalog pages that embeds an iframe:

**File:** `packages/app/src/components/catalog/EntityPage.tsx`

```typescript
import { EntityLayout } from '@backstage/plugin-catalog';

// Add to component entity page
const serviceEntityPage = (
  <EntityLayout>
    {/* ... existing tabs ... */}
    
    {/* NEW: Architecture tab */}
    <EntityLayout.Route path="/architecture" title="Architecture">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <iframe 
            src="/architecture-viewer.html" 
            style={{width: '100%', height: '800px', border: 'none'}}
            title="Architecture Context Map"
          />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```

**Steps:**
1. Copy `viewer.html` to `packages/app/public/architecture-viewer.html`
2. Add tab to EntityPage.tsx
3. Restart frontend: `yarn dev`

**Pros:** Super quick, no React code needed
**Cons:** Not fully integrated with Backstage theme

---

### Option 2: Create Frontend Plugin (Recommended)

Create a proper Backstage frontend plugin with React components.

**Structure:**
```
plugins/architecture/
├── package.json
├── src/
│   ├── plugin.ts                    # Plugin definition
│   ├── routes.ts                    # Route definitions
│   ├── components/
│   │   ├── ContextMapPage/
│   │   │   ├── ContextMapPage.tsx   # Main page component
│   │   │   ├── ContextCard.tsx      # Bounded context card
│   │   │   ├── RelationshipGraph.tsx # D3.js visualization
│   │   │   └── index.ts
│   │   ├── ContextDetailPage/
│   │   │   └── ContextDetailPage.tsx # Drill-down page
│   │   └── EntityArchitectureCard/
│   │       └── EntityArchitectureCard.tsx # Catalog card widget
│   ├── api/
│   │   └── ArchitectureClient.ts    # API client
│   └── index.ts
```

**Key Files to Create:**

**1. Plugin Definition** (`src/plugin.ts`):
```typescript
import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const architecturePlugin = createPlugin({
  id: 'architecture',
  routes: {
    root: rootRouteRef,
  },
});

export const ArchitecturePage = architecturePlugin.provide(
  createRoutableExtension({
    name: 'ArchitecturePage',
    component: () => import('./components/ContextMapPage').then(m => m.ContextMapPage),
    mountPoint: rootRouteRef,
  }),
);
```

**2. Main Page Component** (`src/components/ContextMapPage/ContextMapPage.tsx`):
```typescript
import React from 'react';
import { Content, Header, Page } from '@backstage/core-components';
import { Grid, Card, CardContent } from '@material-ui/core';
import { useApi, configApiRef } from '@backstage/core-plugin-api';

export const ContextMapPage = () => {
  const config = useApi(configApiRef);
  const backendUrl = config.getString('backend.baseUrl');
  const [contextMap, setContextMap] = React.useState(null);

  React.useEffect(() => {
    fetch(`${backendUrl}/api/architecture/context-map`)
      .then(res => res.json())
      .then(data => setContextMap(data));
  }, [backendUrl]);

  return (
    <Page themeId="tool">
      <Header title="Architecture Context Map" subtitle="DDD Bounded Context Discovery" />
      <Content>
        <Grid container spacing={3}>
          {contextMap?.contexts.map(context => (
            <Grid item xs={12} md={6} lg={4} key={context.id}>
              <Card>
                <CardContent>
                  <h3>{context.name}</h3>
                  <p>{context.components.length} components</p>
                  {/* Add more details */}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Content>
    </Page>
  );
};
```

**3. Register in App** (`packages/app/src/App.tsx`):
```typescript
import { ArchitecturePage } from '@internal/plugin-architecture';

// Add route
<Route path="/architecture" element={<ArchitecturePage />} />
```

**Create Plugin:**
```bash
cd /home/surendra/Desktop/repo/PROJECTS/backstage
yarn new --select plugin
# Name: architecture
# Follow prompts
```

**Pros:** 
- Full Backstage integration
- Proper theme support
- Reusable components
- Can add to catalog entity pages

**Cons:** More work, requires React knowledge

---

### Option 3: Use Backstage's TechDocs (Quick Alternative)

Convert your context map to Markdown and display via TechDocs:

**Create:** `docs/architecture/context-map.md`

```markdown
# Context Map

## Bounded Contexts

### Payment Core
- **Team**: payments-squad
- **Components**: 
  - payment-gateway
  - payment-validator
- **Provides**: 2 APIs
- **Consumes**: 1 API

[View Details](/architecture/contexts/payment-core)

<!-- Auto-generate this from API -->
```

**Auto-generate with script:**
```bash
curl http://localhost:7007/api/architecture/context-map | \
  jq -r '.contexts[] | "### \(.name)\n- **Team**: \(.team)\n- **Components**: \(.components | length)\n\n"' \
  > docs/architecture/context-map.md
```

**Pros:** Uses existing Backstage feature, no new plugin needed
**Cons:** Static content, manual refresh needed

---

## Recommendation for Now

**Short term (immediate):**
1. ✅ Use the standalone `viewer.html` (already created!)
2. Open in browser whenever you need to see context map
3. Click refresh button to see latest data

**Medium term (1-2 weeks):**
- Create frontend plugin (Option 2) with basic React components
- Add to Backstage sidebar navigation
- Integrate with catalog entity pages

**Long term (future):**
- Add D3.js graph visualization
- Interactive filtering/search
- Drill-down to component details
- Export diagrams
- Historical tracking

## Next Steps

Would you like me to:
1. **Create the frontend plugin scaffolding** (React components)?
2. **Add iframe integration** to existing catalog pages (quick win)?
3. **Create a script** to auto-generate TechDocs markdown?
4. **Just use the viewer.html** for now and move on?

Let me know what works best for your timeline! The standalone viewer should work great for now. 🚀
