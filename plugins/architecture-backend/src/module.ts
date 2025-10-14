/**
 * Architecture Catalog Module
 * 
 * Queries the catalog database directly to access entity data.
 * This is a prerequisite plugin that requires direct database access.
 */

import { createBackendModule } from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { coreServices } from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { Knex } from 'knex';
import {
  BoundedContext,
  ApiReference,
  ContextRelationship,
  ContextRelationshipType,
  ContextMap,
} from './types';

// Shared instance for HTTP plugin access
let moduleInstance: ArchitectureModule | undefined;

export function getModuleInstance(): ArchitectureModule | undefined {
  return moduleInstance;
}

/**
 * Architecture Module
 * Provides bounded context discovery and mapping using direct database queries
 */
export class ArchitectureModule {
  private readonly logger: any;
  private knexClient: Knex | null = null;

  constructor(logger: any) {
    this.logger = logger;
  }

  /**
   * Initialize database connection
   */
  async initialize(databaseService: any) {
    this.knexClient = await databaseService.getClient();
    this.logger.info('Architecture module: Database client initialized');
  }

  /**
   * Get all entities from database
   */
  private async getEntities(): Promise<Entity[]> {
    if (!this.knexClient) {
      this.logger.error('Database client not initialized');
      return [];
    }

    try {
      const rows = await this.knexClient('final_entities')
        .select('entity_id', 'final_entity')
        .orderBy('entity_id');

      const entities = rows
        .map(row => {
          try {
            return JSON.parse(row.final_entity) as Entity;
          } catch (error) {
            this.logger.warn(`Failed to parse entity ${row.entity_id}:`, error);
            return null;
          }
        })
        .filter((e): e is Entity => e !== null);

      this.logger.info(`Architecture: Retrieved ${entities.length} entities from database`);
      return entities;
    } catch (error) {
      this.logger.error('Failed to query entities from database:', error);
      return [];
    }
  }

  /**
   * Discover all bounded contexts
   */
  async discoverContexts(): Promise<BoundedContext[]> {
    this.logger.info('Architecture: Discovering bounded contexts...');

    // Query entities from database
    const entities = await this.getEntities();
    const components = entities.filter(e => e.kind === 'Component');
    const apis = entities.filter(e => e.kind === 'API');

    this.logger.info(`Architecture: Found ${components.length} components, ${apis.length} APIs`);

    const contexts = this.groupComponentsIntoContexts(components, apis);
    this.logger.info(`Architecture: Discovered ${contexts.length} bounded contexts`);

    return contexts;
  }

  /**
   * Build complete context map
   */
  async buildContextMap(): Promise<ContextMap> {
    const contexts = await this.discoverContexts();
    const relationships = this.inferRelationships(contexts);

    return {
      contexts,
      relationships,
      metadata: {
        generatedAt: new Date(),
        version: '1.0',
        totalContexts: contexts.length,
        totalRelationships: relationships.length,
      },
    };
  }

  /**
   * Analyze a specific context
   */
  async analyzeContext(contextId: string) {
    const contextMap = await this.buildContextMap();
    const context = contextMap.contexts.find(c => c.id === contextId);

    if (!context) {
      return null;
    }

    const upstream = contextMap.relationships.filter(
      r => r.downstreamContext === contextId
    );
    const downstream = contextMap.relationships.filter(
      r => r.upstreamContext === contextId
    );

    return { context, upstream, downstream };
  }

  /**
   * Group components into bounded contexts by system/domain
   */
  private groupComponentsIntoContexts(
    components: Entity[],
    apis: Entity[],
  ): BoundedContext[] {
    const contextMap = new Map<string, BoundedContext>();

    for (const component of components) {
      const system = component.spec?.system as string;
      const domain = component.metadata.annotations?.['backstage.io/domain'] as string;
      
      const contextId = system || domain || 'default-context';
      const contextName = this.formatContextName(contextId);

      if (!contextMap.has(contextId)) {
        contextMap.set(contextId, {
          id: contextId,
          name: contextName,
          domain: domain,
          components: [],
          providedApis: [],
          consumedApis: [],
          capabilities: [],
        });
      }

      const context = contextMap.get(contextId)!;

      // Add component
      const githubUrl = this.extractGitHubUrl(component);
      context.components.push({
        name: component.metadata.name,
        entityRef: `component:default/${component.metadata.name}`,
        type: component.spec?.type as string,
        githubUrl,
      });

      if (githubUrl && !context.sourceUrl) {
        context.sourceUrl = githubUrl;
      }

      // Add provided APIs
      const providesApis = (component.spec?.providesApis as string[]) || [];
      for (const apiRef of providesApis) {
        const apiName = this.extractApiName(apiRef);
        const api = apis.find(a => a.metadata.name === apiName);
        
        if (api && !context.providedApis.some(a => a.name === apiName)) {
          context.providedApis.push({
            name: apiName,
            entityRef: apiRef,
            type: api.spec?.type as string,
          });
        }
      }

      // Add consumed APIs
      const consumesApis = (component.spec?.consumesApis as string[]) || [];
      for (const apiRef of consumesApis) {
        const apiName = this.extractApiName(apiRef);
        const api = apis.find(a => a.metadata.name === apiName);
        
        if (api && !context.consumedApis.some(a => a.name === apiName)) {
          context.consumedApis.push({
            name: apiName,
            entityRef: apiRef,
            type: api.spec?.type as string,
          });
        }
      }

      // Extract team ownership
      const owner = component.spec?.owner as string;
      if (owner && !context.team) {
        context.team = owner;
      }
    }

    return Array.from(contextMap.values());
  }

  /**
   * Infer DDD relationships between contexts
   */
  private inferRelationships(contexts: BoundedContext[]): ContextRelationship[] {
    const relationships: ContextRelationship[] = [];
    let relationshipId = 1;

    for (const downstreamContext of contexts) {
      for (const consumedApi of downstreamContext.consumedApis) {
        const upstreamContext = contexts.find(c =>
          c.providedApis.some(api => api.name === consumedApi.name)
        );

        if (upstreamContext && upstreamContext.id !== downstreamContext.id) {
          const relationshipType = this.determineRelationshipType(
            upstreamContext,
            downstreamContext,
            consumedApi,
          );

          relationships.push({
            id: `rel-${relationshipId++}`,
            upstreamContext: upstreamContext.id,
            downstreamContext: downstreamContext.id,
            relationshipType,
            viaApis: [consumedApi.entityRef],
            strength: 'MEDIUM',
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Determine DDD relationship type
   */
  private determineRelationshipType(
    upstream: BoundedContext,
    downstream: BoundedContext,
    api: ApiReference,
  ): ContextRelationshipType {
    if (upstream.domain === downstream.domain) {
      return 'SHARED_KERNEL';
    }

    if (api.type === 'openapi' || api.type === 'grpc') {
      return 'OPEN_HOST_SERVICE';
    }

    return 'CUSTOMER_SUPPLIER';
  }

  /**
   * Extract GitHub URL from component
   */
  private extractGitHubUrl(component: Entity): string | undefined {
    const repoUrl = component.metadata.annotations?.['github.com/project-slug'];
    if (repoUrl) {
      return `https://github.com/${repoUrl}`;
    }

    const sourceLocation = component.metadata.annotations?.['backstage.io/source-location'];
    if (sourceLocation?.includes('github.com')) {
      return sourceLocation.split(':')[1];
    }

    return undefined;
  }

  /**
   * Extract API name from reference
   */
  private extractApiName(apiRef: string): string {
    const parts = apiRef.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Format context name for display
   */
  private formatContextName(contextId: string): string {
    return contextId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Catalog module registration
export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'architecture',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        database: coreServices.database,
      },
      async init({ catalog, logger, database }) {
        logger.info('Initializing Architecture catalog module with direct DB access...');

        // Create module instance
        moduleInstance = new ArchitectureModule(logger);
        
        // Initialize database connection
        await moduleInstance.initialize(database);

        // Optional: Load mock data for testing
        // Uncomment to automatically populate mock entities
        if (process.env.ARCHITECTURE_USE_MOCK_DATA === 'true') {
          logger.info('ARCHITECTURE_USE_MOCK_DATA enabled - loading mock provider');
          const { MockArchitectureProvider } = await import('./mockProvider');
          const mockProvider = new MockArchitectureProvider(logger);
          catalog.addEntityProvider(mockProvider);
        }

        // Register a minimal entity provider (required for catalogProcessingExtensionPoint)
        catalog.addEntityProvider({
          getProviderName: () => 'ArchitectureObserver',
          connect: async () => {
            logger.info('Architecture module connected to catalog with DB access');
          },
        });

        logger.info('Architecture catalog module initialized (prerequisite: direct DB access)');
      },
    });
  },
});
