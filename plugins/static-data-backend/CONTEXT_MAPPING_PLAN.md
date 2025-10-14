# Context Mapping Implementation Plan

## Overview
Automatically generate DDD/BIAN Context Maps by analyzing microservice repositories to discover bounded context relationships and integration patterns.

---

## Phase 1: Extended Repository Analysis

### 1.1 Parse Additional Configuration Files

**Files to Parse:**
- `application.yml` / `application.properties` - Database connections, Kafka config
- `pom.xml` / `build.gradle` - Shared dependencies
- `kafka-topics.yml` - Event producer/consumer declarations
- `schema-registry/` - Avro schemas
- `docker-compose.yml` - Service dependencies
- `README.md` - Integration documentation

### 1.2 New Fetcher Functions

```typescript
// In fetcher.ts

export interface ContextMappingData {
  databases: DatabaseConnection[];
  kafkaTopics: KafkaTopic[];
  sharedLibraries: SharedLibrary[];
  apiDependencies: ApiDependency[]; // Already have this!
}

export interface DatabaseConnection {
  host: string;
  database: string;
  schema?: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'oracle';
}

export interface KafkaTopic {
  name: string;
  role: 'producer' | 'consumer';
  schema?: string;
  eventType?: string;
}

export interface SharedLibrary {
  groupId: string;
  artifactId: string;
  version: string;
  type: 'internal' | 'external';
}

// Parse application.yml for database and Kafka config
export async function fetchAndParseApplicationConfig(
  github: GitHubConfig,
  repo: string,
  branch: string
): Promise<{
  databases: DatabaseConnection[];
  kafka: { bootstrap: string; topics: string[] };
}> {
  const paths = [
    'src/main/resources/application.yml',
    'src/main/resources/application.properties',
    'application.yml'
  ];
  
  for (const path of paths) {
    try {
      const content = await fetchFileFromGitHub(github, repo, branch, path);
      if (path.endsWith('.yml')) {
        return parseApplicationYml(content);
      } else {
        return parseApplicationProperties(content);
      }
    } catch (e) {
      continue;
    }
  }
  
  return { databases: [], kafka: { bootstrap: '', topics: [] } };
}

function parseApplicationYml(content: string): any {
  const yaml = require('js-yaml');
  const config = yaml.load(content);
  
  const databases: DatabaseConnection[] = [];
  const kafkaTopics: string[] = [];
  
  // Extract Spring datasource
  if (config.spring?.datasource) {
    const url = config.spring.datasource.url || '';
    const match = url.match(/jdbc:(\w+):\/\/([\w.-]+):?(\d+)?\/([\w-]+)/);
    if (match) {
      databases.push({
        type: match[1] as any,
        host: match[2],
        database: match[4]
      });
    }
  }
  
  // Extract Kafka config
  if (config.spring?.kafka) {
    const bootstrap = config.spring.kafka['bootstrap-servers'];
    // Topics might be in custom config
    if (config.kafka?.topics) {
      kafkaTopics.push(...Object.keys(config.kafka.topics));
    }
  }
  
  return { databases, kafka: { bootstrap: bootstrap || '', topics: kafkaTopics } };
}

// Parse Kafka topic declarations (common pattern)
export async function fetchKafkaTopics(
  github: GitHubConfig,
  repo: string,
  branch: string
): Promise<KafkaTopic[]> {
  const topics: KafkaTopic[] = [];
  
  // Check for kafka configuration classes
  const kafkaConfigPaths = [
    'src/main/java/**/kafka/KafkaConfig.java',
    'src/main/java/**/config/KafkaConfig.java',
    'src/main/resources/kafka-topics.yml'
  ];
  
  // Pattern 1: Look for @KafkaListener annotations (consumer)
  // Pattern 2: Look for kafkaTemplate.send() calls (producer)
  
  try {
    // Search for Kafka listeners in source files
    const searchResults = await searchFilesInRepo(github, repo, branch, '@KafkaListener');
    for (const result of searchResults) {
      const topicMatch = result.match(/topics\s*=\s*["']([^"']+)["']/);
      if (topicMatch) {
        topics.push({
          name: topicMatch[1],
          role: 'consumer'
        });
      }
    }
    
    // Search for Kafka producers
    const producerResults = await searchFilesInRepo(github, repo, branch, 'kafkaTemplate.send');
    for (const result of producerResults) {
      const topicMatch = result.match(/send\s*\(\s*["']([^"']+)["']/);
      if (topicMatch) {
        topics.push({
          name: topicMatch[1],
          role: 'producer'
        });
      }
    }
  } catch (e) {
    // Silent fail
  }
  
  return topics;
}

// Parse dependencies for shared libraries
export async function fetchSharedDependencies(
  github: GitHubConfig,
  repo: string,
  branch: string
): Promise<SharedLibrary[]> {
  const gradle = await fetchAndParseBuildGradle(github, repo, branch, 'build.gradle');
  const dependencies: SharedLibrary[] = [];
  
  // Parse dependencies section
  const depRegex = /implementation\s+["']([^:]+):([^:]+):([^"']+)["']/g;
  let match;
  
  while ((match = depRegex.exec(gradle.rawContent)) !== null) {
    const [_, groupId, artifactId, version] = match;
    
    // Check if it's an internal shared library (e.g., com.yourcompany.*)
    const isInternal = groupId.startsWith('com.yourcompany') || 
                       groupId.startsWith('com.yourorg');
    
    dependencies.push({
      groupId,
      artifactId,
      version,
      type: isInternal ? 'internal' : 'external'
    });
  }
  
  return dependencies;
}
```

---

## Phase 2: Context Relationship Detection

### 2.1 Relationship Types (DDD Context Mapping Patterns)

```typescript
// In context-mapper.ts

export enum ContextRelationshipType {
  // Organizational Patterns
  PARTNERSHIP = 'Partnership',              // Mutual dependency, shared success
  SHARED_KERNEL = 'Shared Kernel',         // Shared code/models
  
  // Upstream-Downstream Patterns
  CUSTOMER_SUPPLIER = 'Customer-Supplier', // Downstream influences upstream
  CONFORMIST = 'Conformist',               // Downstream conforms to upstream
  
  // Independent Patterns
  ANTICORRUPTION_LAYER = 'Anticorruption Layer', // Translation layer
  OPEN_HOST_SERVICE = 'Open Host Service',       // Published API
  PUBLISHED_LANGUAGE = 'Published Language',     // Standard protocol
  
  // Anti-patterns
  SHARED_DATABASE = 'Shared Database',     // ⚠️ To be avoided
  BIG_BALL_OF_MUD = 'Big Ball of Mud'     // ⚠️ Unclear boundaries
}

export interface ContextRelationship {
  upstreamContext: string;    // The providing bounded context
  downstreamContext: string;  // The consuming bounded context
  type: ContextRelationshipType;
  integrationPattern: 'REST' | 'Event' | 'SharedDB' | 'gRPC' | 'GraphQL';
  apis?: string[];            // Specific APIs involved
  kafkaTopics?: string[];     // Event topics
  sharedResources?: string[]; // Shared databases, libraries
  description?: string;
}

export function detectContextRelationships(
  components: any[],
  apiRelations: any,
  databaseConnections: Map<string, DatabaseConnection[]>,
  kafkaTopics: Map<string, KafkaTopic[]>,
  sharedLibs: Map<string, SharedLibrary[]>
): ContextRelationship[] {
  
  const relationships: ContextRelationship[] = [];
  const contextMap = new Map<string, string>(); // component -> bounded context
  
  // Build component to bounded context mapping
  for (const component of components) {
    const boundedContext = component.spec.system; // System = Bounded Context
    contextMap.set(component.metadata.name, boundedContext);
  }
  
  // 1. Detect API-based relationships (already have this data!)
  for (const [apiName, relation] of Object.entries(apiRelations)) {
    const providers = (relation as any).providers || [];
    const consumers = (relation as any).consumers || [];
    
    for (const provider of providers) {
      for (const consumer of consumers) {
        const upstreamContext = contextMap.get(provider);
        const downstreamContext = contextMap.get(consumer);
        
        if (upstreamContext && downstreamContext && upstreamContext !== downstreamContext) {
          relationships.push({
            upstreamContext,
            downstreamContext,
            type: ContextRelationshipType.OPEN_HOST_SERVICE,
            integrationPattern: 'REST',
            apis: [apiName],
            description: `${downstreamContext} consumes ${apiName} from ${upstreamContext}`
          });
        }
      }
    }
  }
  
  // 2. Detect Event-based relationships (Kafka)
  const topicProviders = new Map<string, string[]>(); // topic -> [contexts]
  const topicConsumers = new Map<string, string[]>();
  
  for (const [component, topics] of kafkaTopics.entries()) {
    const context = contextMap.get(component);
    if (!context) continue;
    
    for (const topic of topics) {
      if (topic.role === 'producer') {
        if (!topicProviders.has(topic.name)) topicProviders.set(topic.name, []);
        topicProviders.get(topic.name)!.push(context);
      } else {
        if (!topicConsumers.has(topic.name)) topicConsumers.set(topic.name, []);
        topicConsumers.get(topic.name)!.push(context);
      }
    }
  }
  
  for (const [topic, producers] of topicProviders.entries()) {
    const consumers = topicConsumers.get(topic) || [];
    for (const producer of producers) {
      for (const consumer of consumers) {
        if (producer !== consumer) {
          relationships.push({
            upstreamContext: producer,
            downstreamContext: consumer,
            type: ContextRelationshipType.PUBLISHED_LANGUAGE,
            integrationPattern: 'Event',
            kafkaTopics: [topic],
            description: `${consumer} subscribes to ${topic} from ${producer}`
          });
        }
      }
    }
  }
  
  // 3. Detect Shared Database (anti-pattern!)
  const dbToContexts = new Map<string, string[]>();
  
  for (const [component, dbs] of databaseConnections.entries()) {
    const context = contextMap.get(component);
    if (!context) continue;
    
    for (const db of dbs) {
      const dbKey = `${db.host}/${db.database}`;
      if (!dbToContexts.has(dbKey)) dbToContexts.set(dbKey, []);
      if (!dbToContexts.get(dbKey)!.includes(context)) {
        dbToContexts.get(dbKey)!.push(context);
      }
    }
  }
  
  for (const [dbKey, contexts] of dbToContexts.entries()) {
    if (contexts.length > 1) {
      // Shared database detected!
      for (let i = 0; i < contexts.length; i++) {
        for (let j = i + 1; j < contexts.length; j++) {
          relationships.push({
            upstreamContext: contexts[i],
            downstreamContext: contexts[j],
            type: ContextRelationshipType.SHARED_DATABASE,
            integrationPattern: 'SharedDB',
            sharedResources: [dbKey],
            description: `⚠️ ${contexts[i]} and ${contexts[j]} share database ${dbKey}`
          });
        }
      }
    }
  }
  
  // 4. Detect Shared Kernel (shared internal libraries)
  const internalLibToContexts = new Map<string, string[]>();
  
  for (const [component, libs] of sharedLibs.entries()) {
    const context = contextMap.get(component);
    if (!context) continue;
    
    for (const lib of libs) {
      if (lib.type === 'internal') {
        const libKey = `${lib.groupId}:${lib.artifactId}`;
        if (!internalLibToContexts.has(libKey)) internalLibToContexts.set(libKey, []);
        if (!internalLibToContexts.get(libKey)!.includes(context)) {
          internalLibToContexts.get(libKey)!.push(context);
        }
      }
    }
  }
  
  for (const [libKey, contexts] of internalLibToContexts.entries()) {
    if (contexts.length > 1) {
      // Shared internal library - might be Shared Kernel
      for (let i = 0; i < contexts.length; i++) {
        for (let j = i + 1; j < contexts.length; j++) {
          relationships.push({
            upstreamContext: contexts[i],
            downstreamContext: contexts[j],
            type: ContextRelationshipType.SHARED_KERNEL,
            integrationPattern: 'REST', // Default
            sharedResources: [libKey],
            description: `${contexts[i]} and ${contexts[j]} share library ${libKey}`
          });
        }
      }
    }
  }
  
  return relationships;
}
```

---

## Phase 3: Context Map Visualization Data Structure

### 3.1 Generate Context Map JSON

```typescript
export interface ContextMap {
  boundedContexts: BoundedContextNode[];
  relationships: ContextRelationship[];
  metadata: {
    generatedAt: string;
    totalContexts: number;
    totalRelationships: number;
    antiPatterns: number;
  };
}

export interface BoundedContextNode {
  id: string;
  name: string;
  domain: string;
  components: string[];
  apis: {
    provided: string[];
    consumed: string[];
  };
  kafkaTopics: {
    produced: string[];
    consumed: string[];
  };
  databases: DatabaseConnection[];
  owner: string;
  maturity: 'Initial' | 'Developing' | 'Defined' | 'Managed' | 'Optimized';
}

export async function generateContextMap(
  entities: Entity[],
  apiRelations: any,
  repoAnalysis: Map<string, ContextMappingData>
): Promise<ContextMap> {
  
  const boundedContexts: BoundedContextNode[] = [];
  const contextComponents = new Map<string, string[]>();
  
  // Group components by bounded context (system)
  for (const entity of entities) {
    if (entity.kind === 'Component') {
      const system = entity.spec?.system as string;
      if (system) {
        if (!contextComponents.has(system)) {
          contextComponents.set(system, []);
        }
        contextComponents.get(system)!.push(entity.metadata.name);
      }
    }
  }
  
  // Build bounded context nodes
  for (const entity of entities) {
    if (entity.kind === 'System') {
      const contextId = entity.metadata.name;
      const components = contextComponents.get(contextId) || [];
      
      // Aggregate APIs
      const providedApis: string[] = [];
      const consumedApis: string[] = [];
      
      for (const component of components) {
        const componentEntity = entities.find(e => 
          e.kind === 'Component' && e.metadata.name === component
        );
        
        if (componentEntity) {
          const provides = componentEntity.spec?.providesApis as string[] || [];
          const consumes = componentEntity.spec?.consumesApis as string[] || [];
          providedApis.push(...provides.map(api => api.split('/').pop() || api));
          consumedApis.push(...consumes.map(api => api.split('/').pop() || api));
        }
      }
      
      boundedContexts.push({
        id: contextId,
        name: entity.metadata.title || entity.metadata.name,
        domain: entity.spec?.domain as string || 'Unknown',
        components,
        apis: {
          provided: [...new Set(providedApis)],
          consumed: [...new Set(consumedApis)]
        },
        kafkaTopics: {
          produced: [], // TODO: aggregate from repo analysis
          consumed: []
        },
        databases: [], // TODO: aggregate from repo analysis
        owner: entity.spec?.owner as string || 'unknown',
        maturity: 'Developing' // TODO: calculate based on metrics
      });
    }
  }
  
  // Detect relationships
  const databaseConnections = new Map();
  const kafkaTopics = new Map();
  const sharedLibs = new Map();
  
  for (const [component, data] of repoAnalysis.entries()) {
    databaseConnections.set(component, data.databases);
    kafkaTopics.set(component, data.kafkaTopics);
    sharedLibs.set(component, data.sharedLibraries);
  }
  
  const relationships = detectContextRelationships(
    entities.filter(e => e.kind === 'Component'),
    apiRelations,
    databaseConnections,
    kafkaTopics,
    sharedLibs
  );
  
  const antiPatterns = relationships.filter(r => 
    r.type === ContextRelationshipType.SHARED_DATABASE
  ).length;
  
  return {
    boundedContexts,
    relationships,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalContexts: boundedContexts.length,
      totalRelationships: relationships.length,
      antiPatterns
    }
  };
}
```

---

## Phase 4: Backend API Endpoint

### 4.1 Add Context Map Endpoint

```typescript
// In index.ts

router.get('/context-map', async (_req, res) => {
  const provider = getProviderInstance();
  if (!provider) {
    res.status(503).json({ 
      error: 'Provider not initialized yet.' 
    });
    return;
  }

  try {
    const contextMap = await provider.getContextMap();
    res.json(contextMap);
  } catch (error: any) {
    logger.error('Failed to generate context map', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/context-map/:contextId', async (req, res) => {
  const provider = getProviderInstance();
  if (!provider) {
    res.status(503).json({ error: 'Provider not initialized yet.' });
    return;
  }

  try {
    const contextId = req.params.contextId;
    const contextDetails = await provider.getContextDetails(contextId);
    res.json(contextDetails);
  } catch (error: any) {
    logger.error(`Failed to get context details for ${req.params.contextId}`, error);
    res.status(500).json({ error: error.message });
  }
});

// Add auth policy
http.addAuthPolicy({
  path: '/context-map',
  allow: 'unauthenticated',
});
```

### 4.2 Implement in CatalogProvider

```typescript
// In catalogProvider.ts

async getContextMap(): Promise<ContextMap> {
  const result = await this.provider.refresh();
  const apiRelations = await this.getAllApiRelations();
  
  // TODO: Fetch repo analysis data (databases, kafka, etc.)
  const repoAnalysis = new Map<string, ContextMappingData>();
  
  return generateContextMap(result.entities, apiRelations, repoAnalysis);
}

async getContextDetails(contextId: string) {
  const contextMap = await this.getContextMap();
  const context = contextMap.boundedContexts.find(bc => bc.id === contextId);
  
  if (!context) {
    throw new Error(`Bounded context ${contextId} not found`);
  }
  
  // Get relationships involving this context
  const upstreamRelations = contextMap.relationships.filter(r => 
    r.upstreamContext === contextId
  );
  const downstreamRelations = contextMap.relationships.filter(r => 
    r.downstreamContext === contextId
  );
  
  return {
    context,
    upstream: upstreamRelations,
    downstream: downstreamRelations,
    stats: {
      apiProviders: context.apis.provided.length,
      apiConsumers: context.apis.consumed.length,
      upstreamDependencies: upstreamRelations.length,
      downstreamDependencies: downstreamRelations.length
    }
  };
}
```

---

## Phase 5: Visualization Output

### 5.1 Context Map Diagram (PlantUML Format)

```typescript
export function generatePlantUMLContextMap(contextMap: ContextMap): string {
  let plantuml = '@startuml\n';
  plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\n\n';
  plantuml += 'LAYOUT_WITH_LEGEND()\n\n';
  
  // Add bounded contexts as systems
  for (const bc of contextMap.boundedContexts) {
    plantuml += `System(${bc.id}, "${bc.name}", "${bc.components.length} components")\n`;
  }
  
  plantuml += '\n';
  
  // Add relationships
  for (const rel of contextMap.relationships) {
    const label = `${rel.type}\\n${rel.integrationPattern}`;
    const style = rel.type === ContextRelationshipType.SHARED_DATABASE ? 
      '$lineColor="red"' : '';
    
    plantuml += `Rel(${rel.upstreamContext}, ${rel.downstreamContext}, "${label}", ${style})\n`;
  }
  
  plantuml += '\n@enduml';
  return plantuml;
}
```

### 5.2 Mermaid Diagram Format

```typescript
export function generateMermaidContextMap(contextMap: ContextMap): string {
  let mermaid = 'graph LR\n';
  
  // Add bounded contexts
  for (const bc of contextMap.boundedContexts) {
    mermaid += `  ${bc.id}["${bc.name}\\n${bc.components.length} components"]\n`;
  }
  
  mermaid += '\n';
  
  // Add relationships
  for (const rel of contextMap.relationships) {
    const arrow = rel.integrationPattern === 'Event' ? '-.->': '-->';
    const style = rel.type === ContextRelationshipType.SHARED_DATABASE ? 
      ':::danger' : '';
    
    mermaid += `  ${rel.upstreamContext} ${arrow} ${rel.downstreamContext}\n`;
    mermaid += `  ${rel.upstreamContext} -. "${rel.type}" .-> ${rel.downstreamContext}${style}\n`;
  }
  
  mermaid += '\n';
  mermaid += 'classDef danger fill:#f96,stroke:#f00,stroke-width:2px\n';
  
  return mermaid;
}
```

---

## Phase 6: Example Output

### Expected Context Map JSON

```json
{
  "boundedContexts": [
    {
      "id": "payment-core",
      "name": "Payment Core",
      "domain": "payments",
      "components": ["payment-gateway", "payment-validator"],
      "apis": {
        "provided": ["payment-gateway-api-v2", "payment-validation-api-v1"],
        "consumed": []
      },
      "kafkaTopics": {
        "produced": ["payment.completed", "payment.failed"],
        "consumed": []
      },
      "databases": [
        {"type": "postgresql", "host": "payment-db.prod", "database": "payments"}
      ],
      "owner": "payments-squad",
      "maturity": "Optimized"
    },
    {
      "id": "order-core",
      "name": "Order Core",
      "domain": "orders",
      "components": ["order-api", "order-validator"],
      "apis": {
        "provided": ["order-api-v1"],
        "consumed": ["payment-gateway-api-v2"]
      },
      "kafkaTopics": {
        "produced": ["order.created"],
        "consumed": ["payment.completed"]
      },
      "databases": [
        {"type": "postgresql", "host": "order-db.prod", "database": "orders"}
      ],
      "owner": "orders-squad",
      "maturity": "Managed"
    }
  ],
  "relationships": [
    {
      "upstreamContext": "payment-core",
      "downstreamContext": "order-core",
      "type": "Open Host Service",
      "integrationPattern": "REST",
      "apis": ["payment-gateway-api-v2"],
      "description": "order-core consumes payment-gateway-api-v2 from payment-core"
    },
    {
      "upstreamContext": "payment-core",
      "downstreamContext": "order-core",
      "type": "Published Language",
      "integrationPattern": "Event",
      "kafkaTopics": ["payment.completed"],
      "description": "order-core subscribes to payment.completed from payment-core"
    }
  ],
  "metadata": {
    "generatedAt": "2025-10-14T00:00:00Z",
    "totalContexts": 10,
    "totalRelationships": 25,
    "antiPatterns": 2
  }
}
```

---

## Implementation Steps

### Step 1: Extend Fetcher (This Week)
- [ ] Add `fetchAndParseApplicationConfig()` for database detection
- [ ] Add `fetchKafkaTopics()` for event detection  
- [ ] Add `fetchSharedDependencies()` for shared library detection

### Step 2: Context Mapper (Next Week)
- [ ] Create `context-mapper.ts` with relationship detection logic
- [ ] Implement `detectContextRelationships()`
- [ ] Implement `generateContextMap()`

### Step 3: Backend API (Week 3)
- [ ] Add `/context-map` endpoint
- [ ] Add `/context-map/:contextId` endpoint
- [ ] Add diagram generation functions

### Step 4: Testing (Week 3)
- [ ] Test with existing 10 bounded contexts
- [ ] Validate relationship detection
- [ ] Test anti-pattern detection

### Step 5: Documentation (Week 4)
- [ ] Document context mapping process
- [ ] Add usage examples
- [ ] Create troubleshooting guide

---

## Benefits

1. **Automatic Discovery** - No manual mapping required
2. **Anti-pattern Detection** - Highlights shared databases, tight coupling
3. **Integration Inventory** - Complete view of all inter-context communication
4. **Impact Analysis** - Understand blast radius of changes
5. **Architecture Governance** - Enforce DDD/BIAN patterns
6. **Living Documentation** - Always up-to-date with actual code

---

## Next Steps

Would you like me to:
1. **Start implementing the fetcher extensions** to parse application.yml and detect databases/Kafka?
2. **Create the context-mapper.ts** file with relationship detection logic?
3. **Add the backend endpoints** for context map API?
4. **Generate a sample context map** with your existing data to see what it would look like?

Let me know which part you'd like to start with!
