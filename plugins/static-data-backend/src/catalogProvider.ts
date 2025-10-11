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
}
