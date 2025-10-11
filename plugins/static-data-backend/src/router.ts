import express from 'express';
import { Logger } from 'winston';
import { StaticDataProvider } from './provider';
import { HttpAuthService } from '@backstage/backend-plugin-api';

export type RouterOptions = {
  logger: Logger;
  httpAuth: HttpAuthService;
  githubRepo: string;
  token?: string;
  branch?: string;
  writeToCatalog?: boolean;
};

export async function createStaticDataRouter(options: RouterOptions) {
  const router = express.Router();
  const provider = new StaticDataProvider({
    logger: options.logger,
    github: { repo: options.githubRepo, token: options.token, branch: options.branch },
    writeToCatalog: options.writeToCatalog,
  });

  router.post('/refresh', async (_req, res) => {
    // Allow requests without authentication (or add auth check here if needed)
    try {
      const result = await provider.refresh();
      res.status(200).json(result);
    } catch (error: any) {
      options.logger.error('Failed to refresh static data', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
