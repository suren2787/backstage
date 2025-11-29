import express from 'express';
import { Config } from '@backstage/config';
import { Knex } from 'knex';
import { fetchKafkaTopologyFromGitHub, GitHubConfig } from './github';
import { KafkaTopologyContext } from './types';

export async function createRouter(options: {
  config: Config;
  database: Knex;
}): Promise<express.Router> {
  const router = express.Router();

  // GET /kafka-topology: fetch all topology data from DB
  router.get('/', async (_req, res) => {
    try {
      const data = await options.database('kafka_topology').select('*');
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch Kafka topology data' });
    }
  });

  // POST /kafka-topology/refresh: fetch from GitHub, update DB
  router.post('/refresh', async (_req, res) => {
    try {
      // Read config from app-config.yaml
      const githubConfig: GitHubConfig = {
        owner: options.config.getOptionalString('integrations.kafkaTopology.githubOwner') || '',
        repo: options.config.getOptionalString('integrations.kafkaTopology.githubRepo') || '',
        branch: options.config.getOptionalString('integrations.kafkaTopology.githubBranch') || 'master',
        path: options.config.getOptionalString('integrations.kafkaTopology.githubPath') || '',
        token: options.config.getOptionalString('integrations.kafkaTopology.githubToken') || '',
      };
      if (!githubConfig.owner || !githubConfig.repo || !githubConfig.path || !githubConfig.token) {
        return res.status(400).json({ error: 'Missing GitHub config in app-config.yaml' });
      }
      // Fetch from GitHub
      const contexts: KafkaTopologyContext[] = await fetchKafkaTopologyFromGitHub(githubConfig);
      // Clear and update DB
      await options.database('kafka_topology').del();
      for (const ctx of contexts) {
        await options.database('kafka_topology').insert({
          context: ctx.context,
          topics: JSON.stringify(ctx.topics),
          source: ctx.source,
          path: ctx.path,
          updated_at: new Date().toISOString(),
        });
      }
      return res.json({ message: 'Kafka topology data refreshed from GitHub', count: contexts.length });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to refresh Kafka topology data', details: (e as Error).message });
    }
  });

  return router;
}
