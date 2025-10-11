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
        
        logger.info('Static data HTTP plugin initialized with /health and /refresh endpoints');
        http.use(router);
        http.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        http.addAuthPolicy({
          path: '/refresh',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
