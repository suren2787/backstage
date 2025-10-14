/**
 * Bounded Context data model based on Domain-Driven Design principles
 */

/**
 * DDD Context Mapping Patterns
 */
export type ContextRelationshipType =
  | 'SHARED_KERNEL'           // Two contexts share a common model
  | 'CUSTOMER_SUPPLIER'       // Downstream is customer, upstream is supplier
  | 'CONFORMIST'              // Downstream conforms to upstream model
  | 'ANTICORRUPTION_LAYER'    // Downstream protects itself with translation layer
  | 'OPEN_HOST_SERVICE'       // Upstream provides well-defined protocol
  | 'PUBLISHED_LANGUAGE'      // Shared, well-documented language/schema
  | 'SEPARATE_WAYS'           // No connection between contexts
  | 'PARTNERSHIP';            // Mutual dependency, coordinated planning

/**
 * Represents a bounded context in DDD
 */
export interface BoundedContext {
  id: string;
  name: string;
  description?: string;
  
  // Context ownership and organization
  team?: string;
  domain?: string;
  
  // Components/services that belong to this context
  components: ComponentReference[];
  
  // APIs provided by this context
  providedApis: ApiReference[];
  
  // APIs consumed from other contexts
  consumedApis: ApiReference[];
  
  // Source code location
  sourceUrl?: string;
  
  // Business capabilities
  capabilities?: string[];
  
  // Strategic classification
  contextType?: 'CORE' | 'SUPPORTING' | 'GENERIC';
}

/**
 * Reference to a component (microservice, application)
 */
export interface ComponentReference {
  name: string;
  entityRef: string;
  type: string;
  githubUrl?: string;
  // Structured GitHub repository information
  githubOrg?: string;      // GitHub organization/owner
  githubRepo?: string;     // Repository name
  githubPath?: string;     // Path within repository (if specified)
}

/**
 * Reference to an API
 */
export interface ApiReference {
  name: string;
  entityRef: string;
  version?: string;
  type?: string;          // rest, grpc, graphql, async
}

/**
 * Relationship between two bounded contexts
 */
export interface ContextRelationship {
  id: string;
  upstreamContext: string;    // Context ID
  downstreamContext: string;  // Context ID
  relationshipType: ContextRelationshipType;
  
  // Communication mechanism
  viaApis?: string[];         // API entity refs
  
  // Additional metadata
  description?: string;
  strength?: 'WEAK' | 'MEDIUM' | 'STRONG';
}

/**
 * Complete context map showing all contexts and their relationships
 */
export interface ContextMap {
  contexts: BoundedContext[];
  relationships: ContextRelationship[];
  metadata: {
    generatedAt: Date;
    version: string;
    totalContexts: number;
    totalRelationships: number;
  };
}

/**
 * Analysis result for a specific context
 */
export interface ContextAnalysis {
  context: BoundedContext;
  upstream: ContextRelationship[];
  downstream: ContextRelationship[];
  metrics: {
    cohesion: number;           // 0-1, internal consistency
    coupling: number;           // 0-1, external dependencies
    apiCount: number;
    dependencyCount: number;
  };
}
