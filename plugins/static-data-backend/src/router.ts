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

  return router;
}
