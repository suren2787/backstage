import express from 'express';
import { Logger } from 'winston';
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { StaticDataEntityProvider } from './catalogProvider';

export type RouterOptions = {
  logger: Logger;
  httpAuth: HttpAuthService;
  entityProvider: StaticDataEntityProvider;
};

export async function createStaticDataRouter(options: RouterOptions) {
  const router = express.Router();

  router.post('/refresh', async (_req, res) => {
    // Allow requests without authentication (or add auth check here if needed)
    try {
      const result = await options.entityProvider.refresh();
      res.status(200).json({ 
        imported: result.imported, 
        errors: result.errors 
      });
    } catch (error: any) {
      options.logger.error('Failed to refresh static data', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get consumers of a specific API
  // GET /api/static-data/api-consumers/:apiName
  // Example: /api/static-data/api-consumers/payment-core-payment-gateway-api-v2
  router.get('/api-consumers/:apiName', async (req, res) => {
    try {
      const apiName = req.params.apiName;
      const consumers = await options.entityProvider.getApiConsumers(apiName);
      
      res.status(200).json({
        api: apiName,
        consumerCount: consumers.length,
        consumers: consumers
      });
    } catch (error: any) {
      options.logger.error(`Failed to get consumers for API ${req.params.apiName}`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get providers of a specific API
  // GET /api/static-data/api-providers/:apiName
  router.get('/api-providers/:apiName', async (req, res) => {
    try {
      const apiName = req.params.apiName;
      const providers = await options.entityProvider.getApiProviders(apiName);
      
      res.status(200).json({
        api: apiName,
        providerCount: providers.length,
        providers: providers
      });
    } catch (error: any) {
      options.logger.error(`Failed to get providers for API ${req.params.apiName}`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all API relations summary
  // GET /api/static-data/api-relations
  router.get('/api-relations', async (_req, res) => {
    try {
      const relations = await options.entityProvider.getAllApiRelations();
      res.status(200).json(relations);
    } catch (error: any) {
      options.logger.error('Failed to get API relations', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
