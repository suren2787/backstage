import { createBackendPlugin } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';
import { Router } from 'express';
import { getProviderInstance } from './module';

// Standalone plugin for HTTP routes
export default createBackendPlugin({
  pluginId: 'static-data',
  register(env) {
    env.registerInit({
      deps: {
        http: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ http, logger }) {
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
            const result = await provider.refresh();
            res.json(result);
          } catch (error: any) {
            logger.error('Manual refresh failed', error);
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
        
        logger.info('Static data HTTP plugin initialized with /health, /refresh, /api-consumers, /api-providers, and /api-relations endpoints');
        http.use(router);
        http.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        http.addAuthPolicy({
          path: '/refresh',
          allow: 'unauthenticated',
        });
        http.addAuthPolicy({
          path: '/api-consumers',
          allow: 'unauthenticated',
        });
        http.addAuthPolicy({
          path: '/api-providers',
          allow: 'unauthenticated',
        });
        http.addAuthPolicy({
          path: '/api-relations',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
