/**
 * Mock Entity Provider for Architecture Testing
 * 
 * Provides simulated catalog entities for testing context mapping
 * without requiring access to real repositories.
 */

import { EntityProvider, EntityProviderConnection } from '@backstage/plugin-catalog-node';
import { generateMockCatalogEntities } from './mockData';

export class MockArchitectureProvider implements EntityProvider {
  private readonly logger: any;
  private connection?: EntityProviderConnection;

  constructor(logger: any) {
    this.logger = logger;
  }

  getProviderName(): string {
    return 'MockArchitectureProvider';
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    this.logger.info('MockArchitectureProvider: Connecting...');
    
    // Load mock data on connect
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.connection) {
      this.logger.warn('MockArchitectureProvider: Not connected yet');
      return;
    }

    this.logger.info('MockArchitectureProvider: Loading mock entities...');
    
    const entities = generateMockCatalogEntities();
    
    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: `mock-architecture-provider:${entity.kind.toLowerCase()}:${entity.metadata.name}`,
      })),
    });

    this.logger.info(`MockArchitectureProvider: Loaded ${entities.length} mock entities`);
    this.logger.info(`  - Domains: ${entities.filter(e => e.kind === 'Domain').length}`);
    this.logger.info(`  - Systems: ${entities.filter(e => e.kind === 'System').length}`);
    this.logger.info(`  - APIs: ${entities.filter(e => e.kind === 'API').length}`);
    this.logger.info(`  - Components: ${entities.filter(e => e.kind === 'Component').length}`);
  }
}
