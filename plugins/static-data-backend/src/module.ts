import { StaticDataEntityProvider } from './catalogProvider';
import { createBackendModule } from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { coreServices } from '@backstage/backend-plugin-api';
import { createDatabaseClient } from './database/client';

// Store provider instance globally so the HTTP plugin can access it
let providerInstance: StaticDataEntityProvider | undefined;

export function getProviderInstance(): StaticDataEntityProvider | undefined {
  return providerInstance;
}

// Catalog module for entity provider
export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'static-data',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        database: coreServices.database,
      },
      async init({ catalog, logger, config, scheduler, database }) {
        // Read configuration from app-config.yaml
        const staticDataConfig = config.getOptionalConfig('staticData');
        const githubConfig = staticDataConfig?.getOptionalConfig('github');
        
        const repo = githubConfig?.getOptionalString('repo') || process.env.STATIC_DATA_REPO || 'suren2787/static-data';
        const token = githubConfig?.getOptionalString('token') || process.env.STATIC_DATA_GITHUB_TOKEN;
        const branch = githubConfig?.getOptionalString('branch') || process.env.STATIC_DATA_BRANCH || 'master';
        
        // Read schedule configuration (default: every 30 minutes)
        const scheduleFrequency = staticDataConfig?.getOptionalString('schedule.frequency') || 
                                  process.env.STATIC_DATA_SCHEDULE_FREQUENCY || 
                                  '*/30 * * * *'; // cron format: every 30 minutes

        if (!token) {
          logger.warn('StaticDataEntityProvider: GitHub token not configured. Provider will not be registered.');
          return;
        }

        // Initialize database client
        let databaseClient;
        try {
          logger.info('StaticDataEntityProvider: initializing database client...');
          databaseClient = await createDatabaseClient(database, logger);
          logger.info('StaticDataEntityProvider: database client initialized successfully');
        } catch (error) {
          logger.error('StaticDataEntityProvider: failed to initialize database client', error as Error);
          logger.error('StaticDataEntityProvider: error details:', error);
          // Continue without database tracking
        }

        // Create entity provider with database client
        providerInstance = new StaticDataEntityProvider(
          logger as any,
          {
            repo,
            token,
            branch,
          },
          databaseClient
        );

        // Register with catalog
        catalog.addEntityProvider(providerInstance);
        logger.info(`StaticDataEntityProvider registered with catalog (repo: ${repo}, branch: ${branch})`);
        
        // Schedule periodic refresh
        await scheduler.scheduleTask({
          id: 'static-data-refresh',
          frequency: { cron: scheduleFrequency },
          timeout: { minutes: 10 },
          fn: async () => {
            logger.info('StaticDataEntityProvider: scheduled refresh starting');
            try {
              const result = await providerInstance!.refresh({ manual: false });
              logger.info(`StaticDataEntityProvider: scheduled refresh completed - imported ${result.imported} entities with ${result.errors.length} errors`);
            } catch (error: any) {
              logger.error('StaticDataEntityProvider: scheduled refresh failed', error as Error);
            }
          },
        });
        
        logger.info(`StaticDataEntityProvider: scheduled refresh configured (frequency: ${scheduleFrequency})`);
      },
    });
  },
});
