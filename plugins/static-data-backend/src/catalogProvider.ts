import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Logger } from 'winston';
import { StaticDataProvider } from './provider';
import { GitHubConfig } from './fetcher';

export class StaticDataEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  private readonly provider: StaticDataProvider;

  constructor(
    private readonly logger: Logger,
    github: GitHubConfig,
  ) {
    this.provider = new StaticDataProvider({
      logger,
      github,
      writeToCatalog: false,
      writeToFile: false,
    });
  }

  getProviderName(): string {
    return 'StaticDataEntityProvider';
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    this.logger.info('StaticDataEntityProvider connected');
    // Trigger initial refresh in background
    this.refresh().catch(e => this.logger.error('Initial static-data refresh failed', e));
  }

  async refresh(): Promise<{ imported: number; errors: string[] }> {
    if (!this.connection) {
      throw new Error('StaticDataEntityProvider not connected');
    }

    this.logger.info('StaticDataEntityProvider: starting refresh');
    const result = await this.provider.refresh();

    if (result.errors.length > 0) {
      this.logger.warn(`StaticDataEntityProvider: refresh completed with ${result.errors.length} errors`);
      result.errors.forEach(err => this.logger.warn(`  - ${err}`));
    }

    // Apply entities to catalog
    if (result.entities.length > 0) {
      await this.connection.applyMutation({
        type: 'full',
        entities: result.entities.map(entity => ({
          entity,
          locationKey: 'static-data-provider',
        })),
      });
      this.logger.info(`StaticDataEntityProvider: applied ${result.entities.length} entities to catalog`);
    }

    return { imported: result.imported, errors: result.errors };
  }

  /**
   * Get all components that consume a specific API
   * @param apiName - The API entity name (e.g., "payment-core-payment-gateway-api-v2")
   * @returns Array of component information
   */
  async getApiConsumers(apiName: string): Promise<Array<{
    name: string;
    system: string;
    owner: string;
    type: string;
  }>> {
    const result = await this.provider.refresh();
    const consumers: Array<{
      name: string;
      system: string;
      owner: string;
      type: string;
    }> = [];

    for (const entity of result.entities) {
      if (entity.kind === 'Component' && entity.spec?.consumesApis) {
        const consumesApis = entity.spec.consumesApis as string[];
        // Check if this component consumes the specified API
        if (consumesApis.some(api => api.includes(apiName))) {
          consumers.push({
            name: entity.metadata.name,
            system: entity.spec.system as string || 'unknown',
            owner: entity.spec.owner as string || 'unknown',
            type: entity.spec.type as string || 'unknown',
          });
        }
      }
    }

    return consumers;
  }

  /**
   * Get all components that provide/produce a specific API
   * @param apiName - The API entity name
   * @returns Array of component information
   */
  async getApiProviders(apiName: string): Promise<Array<{
    name: string;
    system: string;
    owner: string;
    type: string;
  }>> {
    const result = await this.provider.refresh();
    const providers: Array<{
      name: string;
      system: string;
      owner: string;
      type: string;
    }> = [];

    for (const entity of result.entities) {
      if (entity.kind === 'Component' && entity.spec?.providesApis) {
        const providesApis = entity.spec.providesApis as string[];
        if (providesApis.some(api => api.includes(apiName))) {
          providers.push({
            name: entity.metadata.name,
            system: entity.spec.system as string || 'unknown',
            owner: entity.spec.owner as string || 'unknown',
            type: entity.spec.type as string || 'unknown',
          });
        }
      }
    }

    return providers;
  }

  /**
   * Get a comprehensive view of all API relations
   * @returns Object mapping APIs to their providers and consumers
   */
  async getAllApiRelations(): Promise<{
    [apiName: string]: {
      providers: string[];
      consumers: string[];
    };
  }> {
    const result = await this.provider.refresh();
    const relations: {
      [apiName: string]: {
        providers: string[];
        consumers: string[];
      };
    } = {};

    // Initialize with all APIs
    for (const entity of result.entities) {
      if (entity.kind === 'API') {
        relations[entity.metadata.name] = {
          providers: [],
          consumers: [],
        };
      }
    }

    // Map components to APIs
    for (const entity of result.entities) {
      if (entity.kind === 'Component') {
        const componentName = entity.metadata.name;

        // Check provides
        if (entity.spec?.providesApis) {
          const providesApis = entity.spec.providesApis as string[];
          for (const apiRef of providesApis) {
            // Extract API name from "API:default/api-name" format
            const apiName = apiRef.split('/').pop();
            if (apiName && relations[apiName]) {
              relations[apiName].providers.push(componentName);
            }
          }
        }

        // Check consumes
        if (entity.spec?.consumesApis) {
          const consumesApis = entity.spec.consumesApis as string[];
          for (const apiRef of consumesApis) {
            const apiName = apiRef.split('/').pop();
            if (apiName && relations[apiName]) {
              relations[apiName].consumers.push(componentName);
            }
          }
        }
      }
    }

    return relations;
  }
}
