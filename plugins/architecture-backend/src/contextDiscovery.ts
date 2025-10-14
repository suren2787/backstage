/**
 * Context Discovery Service
 * 
 * Discovers bounded contexts by analyzing:
 * 1. Component metadata from Backstage catalog
 * 2. GitHub source URLs from applications.yaml
 * 3. API relationships (providesApis/consumesApis)
 * 4. Team/domain groupings from catalog
 */

import { Logger } from 'winston';
import { CatalogClient } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import {
  BoundedContext,
  ApiReference,
  ContextRelationship,
  ContextRelationshipType,
  ContextMap,
} from './types';

export interface ContextDiscoveryConfig {
  catalogClient: CatalogClient;
  logger: Logger;
}

export class ContextDiscoveryService {
  private readonly catalogClient: CatalogClient;
  private readonly logger: Logger;

  constructor(config: ContextDiscoveryConfig) {
    this.catalogClient = config.catalogClient;
    this.logger = config.logger;
  }

  /**
   * Discover all bounded contexts from the catalog
   */
  async discoverContexts(): Promise<BoundedContext[]> {
    this.logger.info('Starting bounded context discovery...');

    // Fetch all components and APIs from catalog
    const components = await this.fetchComponents();
    const apis = await this.fetchApis();

    this.logger.info(`Found ${components.length} components and ${apis.length} APIs`);

    // Group components by domain/system to identify contexts
    const contexts = this.groupComponentsIntoContexts(components, apis);

    this.logger.info(`Discovered ${contexts.length} bounded contexts`);
    return contexts;
  }

  /**
   * Build complete context map with relationships
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
   * Get detailed analysis for a specific context
   */
  async analyzeContext(contextId: string): Promise<{
    context: BoundedContext;
    upstream: ContextRelationship[];
    downstream: ContextRelationship[];
  } | null> {
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
   * Fetch all components from catalog
   */
  private async fetchComponents(): Promise<Entity[]> {
    const { items } = await this.catalogClient.getEntities({
      filter: { kind: 'Component' },
    });
    return items;
  }

  /**
   * Fetch all APIs from catalog
   */
  private async fetchApis(): Promise<Entity[]> {
    const { items } = await this.catalogClient.getEntities({
      filter: { kind: 'API' },
    });
    return items;
  }

  /**
   * Group components into bounded contexts
   * Strategy: Use system/domain as primary grouping, then analyze API boundaries
   */
  private groupComponentsIntoContexts(
    components: Entity[],
    apis: Entity[],
  ): BoundedContext[] {
    const contextMap = new Map<string, BoundedContext>();

    for (const component of components) {
      // Determine context from system or domain
      const system = component.spec?.system as string;
      const domain = component.metadata.annotations?.['backstage.io/domain'] as string;
      
      // Use system as primary context identifier
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

      // Add component reference
      const githubUrl = this.extractGitHubUrl(component);
      context.components.push({
        name: component.metadata.name,
        entityRef: `component:default/${component.metadata.name}`,
        type: component.spec?.type as string,
        githubUrl,
      });

      // Extract source URL for context
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
   * Infer relationships between contexts based on API dependencies
   */
  private inferRelationships(contexts: BoundedContext[]): ContextRelationship[] {
    const relationships: ContextRelationship[] = [];
    let relationshipId = 1;

    for (const downstreamContext of contexts) {
      for (const consumedApi of downstreamContext.consumedApis) {
        // Find which context provides this API
        const upstreamContext = contexts.find(c =>
          c.providedApis.some(api => api.name === consumedApi.name)
        );

        if (upstreamContext && upstreamContext.id !== downstreamContext.id) {
          // Determine relationship type based on API characteristics
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
   * Determine the DDD relationship type between contexts
   */
  private determineRelationshipType(
    upstream: BoundedContext,
    downstream: BoundedContext,
    api: ApiReference,
  ): ContextRelationshipType {
    // Simple heuristics - can be enhanced with more sophisticated rules
    
    // Check if it's a shared kernel (both contexts in same domain)
    if (upstream.domain === downstream.domain) {
      return 'SHARED_KERNEL';
    }

    // Check for well-defined published APIs (OpenAPI, gRPC)
    if (api.type === 'openapi' || api.type === 'grpc') {
      return 'OPEN_HOST_SERVICE';
    }

    // Default to customer-supplier relationship
    return 'CUSTOMER_SUPPLIER';
  }

  /**
   * Extract GitHub URL from component metadata
   */
  private extractGitHubUrl(component: Entity): string | undefined {
    // Try annotations first
    const repoUrl = component.metadata.annotations?.['github.com/project-slug'];
    if (repoUrl) {
      return `https://github.com/${repoUrl}`;
    }

    // Try source location
    const sourceLocation = component.metadata.annotations?.['backstage.io/source-location'];
    if (sourceLocation?.includes('github.com')) {
      return sourceLocation.split(':')[1];
    }

    return undefined;
  }

  /**
   * Extract API name from entity reference
   */
  private extractApiName(apiRef: string): string {
    // Handle both "api:default/name" and just "name" formats
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
