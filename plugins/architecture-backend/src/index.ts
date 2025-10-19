/**
 * Architecture Backend Plugin
 * 
 * Provides bounded context mapping and DDD visualization for microservices architecture
 */

import { createBackendPlugin } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';
import { Router } from 'express';
import { getModuleInstance } from './module';
import { generateMockCatalogEntities, getMockDataSummary, getExpectedContextMap } from './mockData';
import * as fs from 'fs';
import * as path from 'path';

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

        // ...existing code...

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

        // Dependencies endpoint
        router.get('/contexts/:contextId/dependencies', async (req, res) => {
          const module = getModuleInstance();
          if (!module) {
            res.status(503).json({ error: 'Architecture module not initialized yet' });
            return;
          }

          try {
            const contextId = req.params.contextId;
            const analysis = await module.analyzeContext(contextId);

            if (!analysis) {
              res.status(404).json({ error: `Context ${contextId} not found` });
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
            logger.error('Error getting context dependencies:', error);
            res.status(500).json({ error: error.message });
          }
        });

        // Mock data endpoints for testing
        router.get('/mock/entities', async (_req, res) => {
          try {
            const entities = generateMockCatalogEntities();
            res.json({ 
              entities,
              count: entities.length 
            });
          } catch (error: any) {
            logger.error('Error generating mock entities:', error);
            res.status(500).json({ error: error.message });
          }
        });

        router.get('/mock/summary', async (_req, res) => {
          try {
            const summary = getMockDataSummary();
            res.json(summary);
          } catch (error: any) {
            logger.error('Error generating mock summary:', error);
            res.status(500).json({ error: error.message });
          }
        });

        router.get('/mock/expected-context-map', async (_req, res) => {
          try {
            const expected = getExpectedContextMap();
            res.json(expected);
          } catch (error: any) {
            logger.error('Error generating expected context map:', error);
            res.status(500).json({ error: error.message });
          }
        });

        // Serve the standalone HTML viewer (with permissive CSP for framing by frontend)
        router.get('/viewer', (_req, res) => {
          const viewerHtml = fs.readFileSync(
            path.join(__dirname, '../viewer.html'),
            'utf-8'
          );
          // Allow frontend (dev server) to embed this page in an iframe
          // Note: replace with your frontend origin(s) in production
          res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:3000");
          // Older browsers may still check X-Frame-Options
          res.setHeader('X-Frame-Options', 'ALLOW-FROM http://localhost:3000');
          res.setHeader('Content-Type', 'text/html');
          res.send(viewerHtml);
        });

        // Serve the viewer JavaScript file (also allow framing origin headers)
        router.get('/viewer.js', (_req, res) => {
          const viewerJs = fs.readFileSync(
            path.join(__dirname, '../viewer.js'),
            'utf-8'
          );
          res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:3000");
          res.setHeader('X-Frame-Options', 'ALLOW-FROM http://localhost:3000');
          res.setHeader('Content-Type', 'application/javascript');
          res.send(viewerJs);
        });

        // Register router
        http.use(router);

        logger.info('Architecture plugin initialized with endpoints:');
        logger.info('  GET /api/architecture/health');
        logger.info('  GET /api/architecture/context-map');
        logger.info('  GET /api/architecture/contexts');
        logger.info('  GET /api/architecture/contexts/:contextId');
        logger.info('  GET /api/architecture/contexts/:contextId/dependencies');

        http.use(router);
        
        // Add auth policies to make endpoints publicly accessible
        const publicEndpoints = [
          '/viewer',
          '/viewer.js',
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
