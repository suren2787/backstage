import { createBackendPlugin } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';
import { Router } from 'express';
import { getProviderInstance } from './module';
import { createDatabaseClient } from './database/client';

// Standalone plugin for HTTP routes
export default createBackendPlugin({
  pluginId: 'static-data',
  register(env) {
    env.registerInit({
      deps: {
        http: coreServices.httpRouter,
        logger: coreServices.logger,
        database: coreServices.database,
        config: coreServices.rootConfig,
      },
      async init({ http, logger, database, config }) {
        // Initialize database client for sync history queries
        let databaseClient: Awaited<ReturnType<typeof createDatabaseClient>> | undefined;
        try {
          databaseClient = await createDatabaseClient(database, logger);
        } catch (error) {
          logger.error('Failed to initialize database client for HTTP routes', error as Error);
        }

        const router = Router();
        
        // Health check endpoint
        router.get('/health', (_req, res) => {
          res.json({ status: 'ok', message: 'Static data plugin is running' });
        });

        // Manual refresh endpoint
        router.post('/refresh', async (_req, res) => {
          const provider = getProviderInstance();
          if (!provider) {
            res.status(503).json({ 
              error: 'Provider not initialized yet. Please wait for catalog module to load.' 
            });
            return;
          }

          try {
            // TODO: Extract user from req once auth is properly configured
            const triggeredBy = 'manual-trigger';
            const result = await provider.refresh({ manual: true, triggeredBy });
            res.json({
              message: 'Catalog refresh triggered successfully',
              imported: result.imported,
              errors: result.errors,
              triggeredBy,
              timestamp: new Date().toISOString(),
            });
          } catch (error: any) {
            logger.error('Manual refresh failed', error as Error);
            res.status(500).json({ error: error.message });
          }
        });

        // Get consumers of a specific API
        router.get('/api-consumers/:apiName', async (req, res) => {
          const provider = getProviderInstance();
          if (!provider) {
            res.status(503).json({ 
              error: 'Provider not initialized yet. Please wait for catalog module to load.' 
            });
            return;
          }

          try {
            const apiName = req.params.apiName;
            const consumers = await provider.getApiConsumers(apiName);
            
            res.status(200).json({
              api: apiName,
              consumerCount: consumers.length,
              consumers: consumers
            });
          } catch (error: any) {
            logger.error(`Failed to get consumers for API ${req.params.apiName}`, error);
            res.status(500).json({ error: error.message });
          }
        });

        // Get providers of a specific API
        router.get('/api-providers/:apiName', async (req, res) => {
          const provider = getProviderInstance();
          if (!provider) {
            res.status(503).json({ 
              error: 'Provider not initialized yet. Please wait for catalog module to load.' 
            });
            return;
          }

          try {
            const apiName = req.params.apiName;
            const providers = await provider.getApiProviders(apiName);
            
            res.status(200).json({
              api: apiName,
              providerCount: providers.length,
              providers: providers
            });
          } catch (error: any) {
            logger.error(`Failed to get providers for API ${req.params.apiName}`, error);
            res.status(500).json({ error: error.message });
          }
        });

        // Get all API relations summary
        router.get('/api-relations', async (_req, res) => {
          const provider = getProviderInstance();
          if (!provider) {
            res.status(503).json({ 
              error: 'Provider not initialized yet. Please wait for catalog module to load.' 
            });
            return;
          }

          try {
            const relations = await provider.getAllApiRelations();
            res.status(200).json(relations);
          } catch (error: any) {
            logger.error('Failed to get API relations', error);
            res.status(500).json({ error: error.message });
          }
        });

        // Get sync settings and latest sync
        router.get('/settings', async (_req, res) => {
          if (!databaseClient) {
            res.status(503).json({ error: 'Database client not available' });
            return;
          }

          try {
            const latestSync = await databaseClient.getLatestSync();
            const health = await databaseClient.getHealthMetrics();
            const stats24h = await databaseClient.getSyncStatistics('24h');

            const staticDataConfig = config.getOptionalConfig('staticData');
            const githubConfig = staticDataConfig?.getOptionalConfig('github');

            const settings = {
              configuration: {
                repository: githubConfig?.getOptionalString('repo') || process.env.STATIC_DATA_REPO || 'unknown',
                branch: githubConfig?.getOptionalString('branch') || process.env.STATIC_DATA_BRANCH || 'main',
                scheduleFrequency: staticDataConfig?.getOptionalString('schedule.frequency') || 
                                   process.env.STATIC_DATA_SCHEDULE_FREQUENCY || 
                                   '*/30 * * * *',
                lastConfigUpdate: new Date(),
              },
              latestSync,
              statistics: stats24h,
              health,
            };

            res.json(settings);
          } catch (error: any) {
            logger.error('Failed to fetch sync settings', error as Error);
            res.status(500).json({ error: 'Failed to fetch sync settings' });
          }
        });

        // Get sync history with pagination
        router.get('/sync-history', async (req, res) => {
          if (!databaseClient) {
            res.status(503).json({ error: 'Database client not available' });
            return;
          }

          try {
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const history = await databaseClient.getSyncHistory(limit, offset);

            res.json({
              history,
              pagination: {
                limit,
                offset,
                hasMore: history.length === limit,
              },
            });
          } catch (error: any) {
            logger.error('Failed to fetch sync history', error as Error);
            res.status(500).json({ error: 'Failed to fetch sync history' });
          }
        });

        // Get specific sync details
        router.get('/sync-history/:syncId', async (req, res) => {
          if (!databaseClient) {
            res.status(503).json({ error: 'Database client not available' });
            return;
          }

          try {
            const sync = await databaseClient.getSyncById(req.params.syncId);

            if (!sync) {
              res.status(404).json({ error: 'Sync not found' });
              return;
            }

            res.json(sync);
          } catch (error: any) {
            logger.error('Failed to fetch sync details', error as Error);
            res.status(500).json({ error: 'Failed to fetch sync details' });
          }
        });

        // Get sync statistics
        router.get('/sync-statistics', async (req, res) => {
          if (!databaseClient) {
            res.status(503).json({ error: 'Database client not available' });
            return;
          }

          try {
            const period = (req.query.period as '24h' | '7d' | '30d') || '7d';
            const statistics = await databaseClient.getSyncStatistics(period);
            res.json(statistics);
          } catch (error: any) {
            logger.error('Failed to fetch sync statistics', error as Error);
            res.status(500).json({ error: 'Failed to fetch sync statistics' });
          }
        });

        // Get health metrics
        router.get('/health-metrics', async (_req, res) => {
          if (!databaseClient) {
            res.status(503).json({ error: 'Database client not available' });
            return;
          }

          try {
            const health = await databaseClient.getHealthMetrics();
            res.json(health);
          } catch (error: any) {
            logger.error('Failed to fetch health metrics', error as Error);
            res.status(500).json({ error: 'Failed to fetch health metrics' });
          }
        });
        
        logger.info('Static data HTTP plugin initialized with sync history endpoints');
        http.use(router);
        
        // Add auth policies for all endpoints
        const publicEndpoints = [
          '/health',
          '/refresh',
          '/api-consumers',
          '/api-providers',
          '/api-relations',
          '/settings',
          '/sync-history',
          '/sync-statistics',
          '/health-metrics',
        ];

        publicEndpoints.forEach(path => {
          http.addAuthPolicy({
            path,
            allow: 'unauthenticated',
          });
        });
      },
    });
  },
});
