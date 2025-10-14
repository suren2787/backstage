# Architecture Plugin - Frequently Asked Questions

## General Questions

### Q: Does this plugin only work with mock/sample data?

**A: NO!** The plugin is **production-ready** and works with your **real catalog data** from any source:
- ✅ Static data imports (applications.yaml)
- ✅ GitHub discovery locations
- ✅ Manually registered entities
- ✅ Any Backstage catalog provider

**Mock data is optional and only for testing when you want to see more examples.**

### Q: Do I need to set ARCHITECTURE_USE_MOCK_DATA=true?

**A: No!** Only set this if you want to load additional mock entities **alongside** your real data for testing purposes.

For production use:
```bash
# Just start backend normally
yarn workspace backend start
```

The plugin automatically discovers contexts from your existing catalog.

### Q: What catalog data do I need for this to work?

**Required:**
- Components with `spec.system` field (this defines the bounded context)
- APIs with types defined in `spec.type`

**Recommended:**
- Components with `providesApis` and `consumesApis` arrays
- GitHub annotations (`github.com/project-slug` or `backstage.io/source-location`)
- `spec.owner` for team ownership

**Example component:**
```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-gateway
  annotations:
    backstage.io/source-location: url:https://github.com/myorg/payment-gateway
spec:
  type: service
  lifecycle: production
  owner: payments-team
  system: payment-core  # ← This defines the bounded context!
  providesApis:
    - payment-gateway-api
  consumesApis:
    - account-validation-api
```

### Q: How does it identify bounded contexts?

The plugin groups components by their `spec.system` field:

1. Read all components from catalog
2. Group components with same `spec.system` value
3. Aggregate APIs from all components in each group
4. That group = 1 Bounded Context

**Example:**
```
Components:
  - payment-gateway (spec.system: "payment-core")
  - payment-validator (spec.system: "payment-core")
  - account-service (spec.system: "account-management")

Result:
  Bounded Context "payment-core":
    - Components: [payment-gateway, payment-validator]
    - APIs: [all APIs from both components combined]
  
  Bounded Context "account-management":
    - Components: [account-service]
    - APIs: [all APIs from account-service]
```

### Q: What if my components don't have spec.system?

The plugin falls back to `metadata.annotations['backstage.io/domain']` if `spec.system` is not set.

If neither exists, the component goes into a "default-context".

**Recommendation:** Set `spec.system` for all components to ensure proper grouping.

## Relationship Detection

### Q: How are relationships between contexts detected?

The plugin analyzes API dependencies:

1. Context A provides API X
2. Context B consumes API X
3. Result: Context A → Context B relationship

**Example:**
```
Payment Core provides: payment-gateway-api
Account Management consumes: payment-gateway-api

→ Relationship: Payment Core → Account Management
```

### Q: What's the difference between current relationship detection and "future enhancements"?

**Current (Working Now):**
- Detects relationships via **REST API dependencies** (`providesApis` ↔ `consumesApis`)
- Visible in catalog metadata

**Future Enhancements:**
- **Kafka topics** - Event-driven relationships not in catalog
- **Shared databases** - Infrastructure coupling not visible via APIs
- **Shared libraries** - Code-level dependencies
- **Repository analysis** - Parse config files for deeper insights

## Technical Questions

### Q: Why does it query the database directly instead of using Catalog API?

**Performance and reliability:**
- Direct DB query is faster (no HTTP overhead)
- Avoids authentication issues between backend services
- Gets complete entity data in one query
- Common pattern in Backstage backend plugins

### Q: What database tables does it query?

Only the `final_entities` table:
```sql
SELECT entity_id, final_entity 
FROM final_entities
WHERE kind IN ('Component', 'API', 'System', 'Domain')
```

No writes, only reads.

### Q: Can I use this in production?

**Yes!** The plugin is production-ready for Phase 0-4 features:
- ✅ Context discovery
- ✅ Relationship detection
- ✅ REST API endpoints
- ✅ Direct database access
- ✅ Tested with real catalog data

## Data & Privacy

### Q: Does it access my GitHub repositories?

**Currently: No.** It only extracts GitHub URLs from catalog annotations.

**Future enhancement:** Repository analysis will optionally clone repos to parse config files (opt-in feature).

### Q: What data does it store?

**None.** The plugin:
- Queries catalog database (read-only)
- Returns context map dynamically
- Does not persist any data

All analysis is done in-memory on each request.

## Testing & Development

### Q: How do I test this without real microservices?

Use the mock data feature:
```bash
export ARCHITECTURE_USE_MOCK_DATA=true
yarn workspace backend start
```

This loads 23 mock entities representing a banking architecture. See `TESTING_WITH_MOCK_DATA.md`.

### Q: What if I want to test with ONLY mock data (no real data)?

Currently, mock data is **added to** your real catalog data. To test with only mock data, you would need to:

1. Use a clean test database, OR
2. Temporarily remove your catalog providers

This is a development-only scenario.

### Q: Can I customize the mock data?

Yes! Edit `plugins/architecture-backend/src/mockData.ts` to add/modify entities.

## Integration Questions

### Q: Do I need the static-data-backend plugin?

**No!** The architecture plugin works with **any catalog source**:
- Static data plugin
- GitHub discovery
- Manual imports
- Azure DevOps discovery
- GitLab discovery
- Any custom catalog provider

It reads from the unified catalog database, regardless of source.

### Q: Can I use this with my existing Backstage setup?

**Yes!** As long as:
1. Your components have `spec.system` fields
2. You have APIs defined with `providesApis`/`consumesApis`
3. Your backend has database access configured

No changes needed to existing catalog data or providers.

### Q: Does this replace the Software Catalog?

**No!** This plugin **extends** the catalog by:
- Analyzing relationships between entities
- Grouping components into bounded contexts
- Applying DDD patterns
- Providing specialized architecture views

The catalog remains the source of truth.

## Troubleshooting

### Q: I get "No contexts found" - what's wrong?

**Check:**
1. Do your components have `spec.system` field?
2. Are components successfully ingested into catalog?
3. Check backend logs for database connection errors

**Debug:**
```bash
# Check database connection
curl http://localhost:7007/api/architecture/health

# Check catalog entities
curl http://localhost:7007/api/catalog/entities?filter=kind=component
```

### Q: Relationships aren't detected - why?

**Check:**
1. Do components have `providesApis` and `consumesApis` arrays?
2. Do the API entity references match actual API entity names?
3. Are APIs in different bounded contexts (same-context APIs don't create relationships)?

**Debug:**
```bash
# Check specific context
curl http://localhost:7007/api/architecture/contexts/your-context-id

# Check if APIs are listed
curl http://localhost:7007/api/architecture/context-map | jq '.contexts[].providedApis'
```

### Q: GitHub URLs show as "undefined" - why?

**Check component annotations:**
```yaml
metadata:
  annotations:
    # Option 1:
    github.com/project-slug: "myorg/myrepo"
    
    # Option 2:
    backstage.io/source-location: "url:https://github.com/myorg/myrepo"
```

Without these annotations, GitHub URL will be undefined (which is fine - URLs are optional).

## Roadmap Questions

### Q: When will Phase 5 features be available?

Phase 5+ features (repository analysis, shared DB detection, etc.) are planned enhancements. Timeline TBD based on:
- User feedback
- Priority of other features
- Community contributions

See `CONTEXT_MAPPING_PLAN.md` for details.

### Q: Can I contribute?

Yes! This is open for contributions. Areas needing help:
- Frontend visualization component
- Repository analysis implementation
- Anti-pattern detection algorithms
- BIAN framework integration
- Documentation improvements

### Q: Will there be a frontend component?

Yes, planned for future release. It will:
- Visualize context map as interactive graph
- Show relationship types with different colors/styles
- Allow drilling into context details
- Export diagrams

## More Questions?

Check the other documentation files:
- `README.md` - Installation and API reference
- `ARCHITECTURE_MODEL.md` - Detailed model explanation
- `CONTEXT_MAPPING_PLAN.md` - Implementation roadmap
- `TESTING_WITH_MOCK_DATA.md` - Testing guide
- `TEST_RESULTS.md` - Actual test results
- `GITHUB_URL_ENHANCEMENT.md` - GitHub URL extraction details

Or search the code for examples!
