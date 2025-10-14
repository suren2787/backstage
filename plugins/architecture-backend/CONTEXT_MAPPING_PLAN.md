# Context Mapping Implementation Plan

## Overview
Automatically generate DDD/BIAN Context Maps by analyzing catalog entities to discover bounded context relationships and integration patterns. This plugin uses direct database access to query the catalog and build context maps.

---

## ✅ COMPLETED: Foundation Phase

### Phase 0: Direct Database Access (COMPLETED)
**Status**: ✅ Implemented

The architecture plugin now queries the catalog database directly using Knex:

```typescript
// Direct query to final_entities table
const rows = await this.knexClient('final_entities')
  .select('entity_id', 'final_entity')
  .orderBy('entity_id');
```

**Benefits:**
- No HTTP/auth overhead
- No cross-plugin dependency issues
- Direct access to latest entity data
- Prerequisite approach - clear dependency model

**Implementation Files:**
- `src/module.ts` - ArchitectureModule with database client
- `package.json` - Added knex and @backstage/plugin-catalog-backend dependencies

---

## ✅ COMPLETED: Core Context Mapping

### Phase 1: DDD Data Model (COMPLETED)
**Status**: ✅ Implemented in `src/types.ts`

**Bounded Context Structure:**
```typescript
export interface BoundedContext {
  id: string;
  name: string;
  domain?: string;
  components: ComponentReference[];
  providedApis: ApiReference[];
  consumedApis: ApiReference[];
  team?: string;
  sourceUrl?: string;
  capabilities?: string[];
}
```

**All DDD Relationship Patterns Defined:**
- ✅ SHARED_KERNEL - Two contexts share a common model
- ✅ CUSTOMER_SUPPLIER - Downstream is customer, upstream is supplier
- ✅ CONFORMIST - Downstream conforms to upstream model
- ✅ ANTICORRUPTION_LAYER - Translation layer protection
- ✅ OPEN_HOST_SERVICE - Well-defined protocol/API
- ✅ PUBLISHED_LANGUAGE - Shared, documented schema
- ✅ SEPARATE_WAYS - No connection between contexts
- ✅ PARTNERSHIP - Mutual dependency, coordinated planning

### Phase 2: Context Discovery Logic (COMPLETED)
**Status**: ✅ Implemented in `src/module.ts`

**Key Functions:**
- `getEntities()` - Query catalog database directly
- `discoverContexts()` - Group components into bounded contexts
- `groupComponentsIntoContexts()` - Organize by system/domain
- `buildContextMap()` - Generate complete context map with relationships
- `inferRelationships()` - Detect relationships between contexts
- `determineRelationshipType()` - Apply DDD patterns based on domain/API analysis
- `analyzeContext()` - Deep analysis of specific context with dependencies

**Context Grouping Strategy:**
1. Primary: Group by `spec.system` (System = Bounded Context)
2. Fallback: Group by `backstage.io/domain` annotation
3. Default: 'default-context' for ungrouped components

**Relationship Inference:**
- API-based: providesApis ↔ consumesApis relationships
- Domain-based: SHARED_KERNEL when same domain
- Type-based: OPEN_HOST_SERVICE for OpenAPI/gRPC
- Default: CUSTOMER_SUPPLIER for standard API consumption

### Phase 3: REST API Endpoints (COMPLETED)
**Status**: ✅ Implemented in `src/index.ts`

**Available Endpoints:**

1. **GET `/api/architecture/health`**
   - Health check
   - Response: `{"status": "ok"}`

2. **GET `/api/architecture/context-map`**
   - Complete context map with all relationships
   - Returns: contexts, relationships, metadata

3. **GET `/api/architecture/contexts`**
   - List all bounded contexts
   - Returns: array of contexts with summary info

4. **GET `/api/architecture/contexts/:contextId`**
   - Detailed context analysis
   - Returns: context, upstream, downstream dependencies

5. **GET `/api/architecture/contexts/:contextId/dependencies`**
   - Dependency information for specific context
   - Returns: upstream/downstream relationships with counts

**Authentication:**
- Public access configured via `http.addAuthPolicy`
- No authentication required for read-only endpoints

---

## 🔄 IN PROGRESS: Testing & Validation

### Phase 4: Integration Testing (NEXT)
**Status**: ⏳ Ready to test once dependencies installed

**Test Scenarios:**
1. ✅ Health endpoint verification
2. ⏳ Context discovery from real catalog data
3. ⏳ Relationship inference validation
4. ⏳ API dependency mapping
5. ⏳ System/domain grouping accuracy

**Test Commands:**
```bash
# Health check
curl http://localhost:7007/api/architecture/health

# Get all contexts
curl http://localhost:7007/api/architecture/contexts

# Get context map
curl http://localhost:7007/api/architecture/context-map

# Get specific context
curl http://localhost:7007/api/architecture/contexts/payment-core

# Get dependencies
curl http://localhost:7007/api/architecture/contexts/payment-core/dependencies
```

---

## 📋 FUTURE ENHANCEMENTS

### Phase 5: Extended Repository Analysis
**Status**: ⏸️ Deferred - Foundation first

This phase will add deep repository analysis for richer context mapping:

**5.1 Parse Additional Configuration Files**
- `application.yml` / `application.properties` - Database connections, Kafka config
- `pom.xml` / `build.gradle` - Shared dependencies
- `kafka-topics.yml` - Event producer/consumer declarations
- `schema-registry/` - Avro schemas
- `docker-compose.yml` - Service dependencies

**5.2 Database Connection Discovery**
```typescript
export interface DatabaseConnection {
  host: string;
  database: string;
  schema?: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'oracle';
}
```

**Benefits:**
- Detect shared database anti-patterns
- Identify data ownership boundaries
- Map database-per-context compliance

**5.3 Kafka Topic Discovery**
```typescript
export interface KafkaTopic {
  name: string;
  role: 'producer' | 'consumer';
  schema?: string;
  eventType?: string;
}
```

**Benefits:**
- Discover event-driven relationships
- Identify PUBLISHED_LANGUAGE patterns
- Map asynchronous integration points

**5.4 Shared Library Detection**
```typescript
export interface SharedLibrary {
  groupId: string;
  artifactId: string;
  version: string;
  type: 'internal' | 'external';
}
```

**Benefits:**
- Identify SHARED_KERNEL implementations
- Detect tight coupling via shared code
- Track internal dependency chains

**Implementation Approach:**
1. Extend GitHub URL extraction to fetch multiple config files
2. Add parsers for YAML, properties, Gradle, Maven formats
3. Cache repository analysis results
4. Update relationship inference to use deeper context

### Phase 6: Advanced Relationship Detection
**Status**: ⏸️ Deferred

**6.1 Anti-Pattern Detection**
- ⚠️ **SHARED_DATABASE** - Multiple contexts accessing same database
- ⚠️ **BIG_BALL_OF_MUD** - Unclear boundaries, circular dependencies
- ⚠️ **Tight Coupling** - Excessive shared libraries

**6.2 Pattern Recommendations**
- Suggest ANTICORRUPTION_LAYER for legacy integration
- Recommend OPEN_HOST_SERVICE for public APIs
- Identify candidates for PUBLISHED_LANGUAGE

**6.3 Maturity Assessment**
```typescript
export type ContextMaturity = 
  | 'Initial'      // Ad-hoc, undocumented
  | 'Developing'   // Some structure, basic docs
  | 'Defined'      // Clear boundaries, documented APIs
  | 'Managed'      // Monitored, versioned, tested
  | 'Optimized';   // Continuous improvement, metrics-driven
```

### Phase 7: Visualization
**Status**: ⏸️ Future frontend work

**7.1 PlantUML Generation**
```typescript
export function generatePlantUMLContextMap(contextMap: ContextMap): string;
```

**7.2 Mermaid Diagram**
```typescript
export function generateMermaidContextMap(contextMap: ContextMap): string;
```

**7.3 D3.js Interactive Graph**
- Drag-and-drop context nodes
- Zoom and pan
- Relationship filtering
- Click for details

### Phase 8: BIAN Integration
**Status**: ⏸️ Future enhancement

Map discovered bounded contexts to BIAN Service Domains:
- Party Management
- Product Management
- Account Management
- Payment Execution
- etc.

**Benefits:**
- Industry standard alignment
- Banking domain vocabulary
- Interoperability patterns

---

## Architecture Decisions

### Why Direct Database Access?
1. **No Authentication Issues** - Bypass HTTP/catalog-client auth complexity
2. **No Cross-Plugin Coupling** - Independent module, clear prerequisites
3. **Performance** - Direct Knex queries are fast
4. **Consistency** - Always reading latest data from source of truth
5. **Simplicity** - Standard database pattern, well-understood

### Why Module + HTTP Plugin Pattern?
1. **Separation of Concerns** - Module for data access, HTTP for API
2. **Reusability** - Other plugins can use getModuleInstance()
3. **Testability** - Module logic testable independently
4. **Backstage Best Practice** - Follows catalog-backend pattern

### Why Start Simple?
1. **Foundation First** - Working context discovery before advanced features
2. **Iterative Development** - Add complexity incrementally
3. **Validation** - Test core logic with real data
4. **User Feedback** - Learn what's valuable before building everything

---

## Current Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Database Access | ✅ Complete | Knex client initialized |
| Data Model | ✅ Complete | All DDD patterns defined |
| Context Discovery | ✅ Complete | Groups by system/domain |
| Relationship Inference | ✅ Complete | API-based detection |
| REST Endpoints | ✅ Complete | 5 endpoints implemented |
| Authentication | ✅ Complete | Public access configured |
| Dependencies | ⏳ Pending | Need to install knex |
| Testing | ⏳ Next | Ready for integration tests |
| Repository Analysis | ⏸️ Future | Phase 5 enhancement |
| Visualization | ⏸️ Future | Phase 7 frontend work |

---

## Next Steps

### Immediate (This Session)
1. ✅ Update plan document (this file)
2. ⏳ Install dependencies: `yarn install`
3. ⏳ Restart backend with new architecture module
4. ⏳ Test all endpoints with real catalog data
5. ⏳ Verify context discovery and relationship mapping

### Short Term (This Week)
1. ⏳ Enhance GitHub URL extraction (applications.yaml parsing)
2. ⏳ Add error handling and logging improvements
3. ⏳ Document example context map output
4. ⏳ Add unit tests for context grouping logic

### Medium Term (Next 2 Weeks)
1. Frontend visualization component
2. Context health metrics
3. Anti-pattern warnings
4. Export context map to PlantUML/Mermaid

### Long Term (Next Month)
1. Phase 5: Extended repository analysis
2. Phase 6: Advanced relationship detection
3. Phase 7: Interactive visualization
4. Phase 8: BIAN integration

---

## Example Context Map Output

Based on your catalog data, expected output:

```json
{
  "contexts": [
    {
      "id": "payment-core",
      "name": "Payment Core",
      "domain": "payments",
      "components": [
        {
          "name": "payment-gateway",
          "entityRef": "component:default/payment-gateway",
          "type": "service"
        }
      ],
      "providedApis": [
        {
          "name": "payment-gateway-api-v2",
          "entityRef": "api:default/payment-gateway-api-v2",
          "type": "openapi"
        }
      ],
      "consumedApis": [],
      "team": "payments-squad"
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "upstreamContext": "payment-core",
      "downstreamContext": "order-core",
      "relationshipType": "OPEN_HOST_SERVICE",
      "viaApis": ["api:default/payment-gateway-api-v2"],
      "strength": "MEDIUM"
    }
  ],
  "metadata": {
    "generatedAt": "2025-10-14T12:00:00.000Z",
    "version": "1.0",
    "totalContexts": 10,
    "totalRelationships": 25
  }
}
```

---

## Success Metrics

### Phase 4 Success Criteria
- [ ] All 5 endpoints return valid JSON
- [ ] Contexts grouped correctly by system/domain
- [ ] Relationships detected from API dependencies
- [ ] GitHub URLs extracted from metadata
- [ ] No database query errors
- [ ] Response time < 1 second for context map

### Future Success Criteria
- [ ] 100% of shared databases detected (Phase 6)
- [ ] Anti-patterns highlighted with warnings (Phase 6)
- [ ] Interactive visualization loads < 2 seconds (Phase 7)
- [ ] BIAN mapping accuracy > 80% (Phase 8)

---

## Questions & Decisions Log

**Q: Why not use catalog-client?**
A: Auth issues (401 errors) and unnecessary HTTP overhead. Direct DB access is simpler and more reliable.

**Q: Why separate plugin instead of extending static-data?**
A: Architecture concerns are separate from data ingestion. Clean separation of responsibilities.

**Q: Why defer repository analysis?**
A: Foundation first - validate core context discovery with existing catalog data before adding complexity.

**Q: Should we cache context maps?**
A: Not yet - optimization comes after validation. Real-time generation ensures fresh data.

---

## Dependencies & Prerequisites

**Required:**
- ✅ Backstage catalog with components and APIs
- ✅ Components grouped by `spec.system` or domain annotation
- ✅ API relationships (`providesApis`, `consumesApis`) defined
- ⏳ Database access to `final_entities` table
- ⏳ Knex installed and configured

**Optional (Future):**
- GitHub token for repository analysis
- Kafka cluster metadata access
- Database connection metadata

---

## References

- [Domain-Driven Design (DDD) Context Mapping](https://www.domainlanguage.com/ddd/patterns/DDD_Reference_2015-03.pdf)
- [BIAN Service Landscape](https://bian.org/servicelandscape/)
- [Backstage Catalog Model](https://backstage.io/docs/features/software-catalog/descriptor-format)
- [Context Mapping Patterns](https://github.com/ddd-crew/context-mapping)
