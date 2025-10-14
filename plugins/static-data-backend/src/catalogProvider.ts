import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Logger } from 'winston';
import { v4 as uuid } from 'uuid';
import { StaticDataProvider } from './provider';
import { GitHubConfig } from './fetcher';
import { DatabaseClient } from './database/client';
import { SyncHistoryRecord, SyncError } from './database/types';

export class StaticDataEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  private readonly provider: StaticDataProvider;
  private readonly databaseClient?: DatabaseClient;
  private readonly github: GitHubConfig;

  constructor(
    private readonly logger: Logger,
    github: GitHubConfig,
    databaseClient?: DatabaseClient,
  ) {
    this.github = github;
    this.databaseClient = databaseClient;
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

  async refresh(options?: { manual?: boolean; triggeredBy?: string }): Promise<{ imported: number; errors: string[] }> {
    if (!this.connection) {
      throw new Error('StaticDataEntityProvider not connected');
    }

    const syncId = uuid();
    const startTime = new Date();
    const syncType = options?.manual ? 'MANUAL' : 'SCHEDULED';

    this.logger.info(`StaticDataEntityProvider: starting ${syncType} refresh (ID: ${syncId})`);

    const syncErrors: SyncError[] = [];
    let status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE' = 'SUCCESS';

    try {
      const result = await this.provider.refresh();

      if (result.errors.length > 0) {
        this.logger.warn(`StaticDataEntityProvider: refresh completed with ${result.errors.length} errors`);
        result.errors.forEach(err => {
          this.logger.warn(`  - ${err}`);
          syncErrors.push({
            phase: 'FETCH',
            error: err,
          });
        });
        status = 'PARTIAL_SUCCESS';
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

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      // Calculate statistics
      const stats = this.calculateStats(result.entities);

      // Save to database
      if (this.databaseClient) {
        await this.saveSyncHistory({
          id: syncId,
          syncType,
          startTime,
          endTime,
          durationMs,
          status,
          stats,
          errors: syncErrors.length > 0 ? syncErrors : undefined,
          triggeredBy: options?.triggeredBy,
          configSnapshot: {
            repository: this.github.repo,
            branch: this.github.branch || 'main',
            scheduleFrequency: process.env.STATIC_DATA_SCHEDULE_FREQUENCY || '*/30 * * * *',
          },
        });
      }

      this.logger.info(`StaticDataEntityProvider: refresh completed (ID: ${syncId}, Duration: ${durationMs}ms, Status: ${status})`);

      return { imported: result.imported, errors: result.errors };
    } catch (error: any) {
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      syncErrors.push({
        phase: 'CATALOG_APPLY',
        error: error.message || String(error),
        stackTrace: error.stack,
      });

      // Save failure to database
      if (this.databaseClient) {
        await this.saveSyncHistory({
          id: syncId,
          syncType,
          startTime,
          endTime,
          durationMs,
          status: 'FAILURE',
          stats: {
            totalEntities: 0,
            entitiesAdded: 0,
            entitiesUpdated: 0,
            entitiesRemoved: 0,
            entitiesUnchanged: 0,
            byType: {},
            apiRelationships: {
              componentsWithApis: 0,
              totalProvidesApis: 0,
              totalConsumesApis: 0,
            },
          },
          errors: syncErrors,
          triggeredBy: options?.triggeredBy,
          configSnapshot: {
            repository: this.github.repo,
            branch: this.github.branch || 'main',
            scheduleFrequency: process.env.STATIC_DATA_SCHEDULE_FREQUENCY || '*/30 * * * *',
          },
        });
      }

      this.logger.error(`StaticDataEntityProvider: refresh failed (ID: ${syncId})`, error);
      throw error;
    }
  }

  private async saveSyncHistory(record: SyncHistoryRecord): Promise<void> {
    if (!this.databaseClient) return;

    try {
      await this.databaseClient.saveSyncHistory(record);
    } catch (error) {
      this.logger.error('Failed to save sync history to database', error as Error);
      // Don't throw - sync succeeded even if we couldn't save history
    }
  }

  private calculateStats(entities: any[]): SyncHistoryRecord['stats'] {
    const byType: { [key: string]: { added: number; updated: number; removed: number } } = {};

    entities.forEach(entity => {
      const kind = entity.kind;
      if (!byType[kind]) {
        byType[kind] = { added: 0, updated: 0, removed: 0 };
      }
      byType[kind].added++; // Simplified - in reality, would track changes
    });

    // Count API relationships
    const componentsWithApis = entities.filter(
      e =>
        e.kind === 'Component' &&
        (e.spec?.providesApis || e.spec?.consumesApis),
    ).length;

    const totalProvidesApis = entities
      .filter(e => e.kind === 'Component')
      .reduce((sum, e) => sum + (e.spec?.providesApis?.length || 0), 0);

    const totalConsumesApis = entities
      .filter(e => e.kind === 'Component')
      .reduce((sum, e) => sum + (e.spec?.consumesApis?.length || 0), 0);

    return {
      totalEntities: entities.length,
      entitiesAdded: entities.length, // Simplified
      entitiesUpdated: 0,
      entitiesRemoved: 0,
      entitiesUnchanged: 0,
      byType,
      apiRelationships: {
        componentsWithApis,
        totalProvidesApis,
        totalConsumesApis,
      },
    };
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
