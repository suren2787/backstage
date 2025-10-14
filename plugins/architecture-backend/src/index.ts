/**
 * Architecture Backend Plugin
 * 
 * Provides bounded context mapping and DDD visualization for microservices architecture
 */

import { createBackendPlugin } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';
import { Router } from 'express';
import { getModuleInstance } from './module';

export default createBackendPlugin({
  pluginId: 'architecture',
  register(env) {
    env.registerInit({
      deps: {
        http: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ http, logger }) {
        logger.info('Initializing Architecture HTTP plugin...');

        const router = Router();

        // Health check
        router.get('/health', (_req, res) => {
          res.json({ status: 'ok', message: 'Architecture plugin is running' });
        });

        // Get complete context map
        router.get('/context-map', async (_req, res) => {
          try {
            const module = getModuleInstance();
            if (!module) {
              res.status(503).json({ 
                error: 'Architecture module not initialized yet. Please wait for catalog module to load.' 
              });
              return;
            }

            logger.info('Generating context map...');
            const contextMap = await module.buildContextMap();
            res.json(contextMap);
          } catch (error: any) {
            logger.error('Failed to generate context map', error);
            res.status(500).json({ error: error.message });
          }
        });

        // Get all bounded contexts
        router.get('/contexts', async (_req, res) => {
          try {
            const module = getModuleInstance();
            if (!module) {
              res.status(503).json({ 
                error: 'Architecture module not initialized yet. Please wait for catalog module to load.' 
              });
              return;
            }

            logger.info('Fetching all bounded contexts...');
            const contexts = await module.discoverContexts();
            res.json({ contexts, total: contexts.length });
          } catch (error: any) {
            logger.error('Failed to fetch contexts', error);
            res.status(500).json({ error: error.message });
          }
        });

        // Get specific context with relationships
        router.get('/contexts/:contextId', async (req, res) => {
          try {
            const module = getModuleInstance();
            if (!module) {
              res.status(503).json({ 
                error: 'Architecture module not initialized yet. Please wait for catalog module to load.' 
              });
              return;
            }

            const { contextId } = req.params;
            logger.info(`Fetching context: ${contextId}`);
            
            const analysis = await module.analyzeContext(contextId);
            
            if (!analysis) {
              res.status(404).json({ error: 'Context not found' });
              return;
            }
            
            res.json(analysis);
          } catch (error: any) {
            logger.error(`Failed to fetch context ${req.params.contextId}`, error);
            res.status(500).json({ error: error.message });
          }
        });

        // Get context dependencies (upstream and downstream)
        router.get('/contexts/:contextId/dependencies', async (req, res) => {
          try {
            const module = getModuleInstance();
            if (!module) {
              res.status(503).json({ 
                error: 'Architecture module not initialized yet. Please wait for catalog module to load.' 
              });
              return;
            }

            const { contextId } = req.params;
            logger.info(`Fetching dependencies for context: ${contextId}`);
            
            const analysis = await module.analyzeContext(contextId);
            
            if (!analysis) {
              res.status(404).json({ error: 'Context not found' });
              return;
            }
            
            res.json({
              contextId,
              upstream: analysis.upstream,
              downstream: analysis.downstream,
              upstreamCount: analysis.upstream.length,
              downstreamCount: analysis.downstream.length,
            });
          } catch (error: any) {
            logger.error(`Failed to fetch dependencies for ${req.params.contextId}`, error);
            res.status(500).json({ error: error.message });
          }
        });

        logger.info('Architecture plugin initialized with endpoints:');
        logger.info('  GET /api/architecture/health');
        logger.info('  GET /api/architecture/context-map');
        logger.info('  GET /api/architecture/contexts');
        logger.info('  GET /api/architecture/contexts/:contextId');
        logger.info('  GET /api/architecture/contexts/:contextId/dependencies');

        http.use(router);
        
        // Add auth policies to make endpoints publicly accessible
        const publicEndpoints = [
          '/health',
          '/context-map',
          '/contexts',
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
