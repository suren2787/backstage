import { createBackendPlugin } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';
import { Router } from 'express';
import { fetchKafkaTopologyFromGitHub, GitHubConfig } from './github';
import { KafkaTopologyContext } from './types';

export default createBackendPlugin({
  pluginId: 'kafka-topology',
  register(env) {
    env.registerInit({
      deps: {
        http: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        database: coreServices.database,
      },
      async init({ http, logger, config, database }) {
        const router = Router();
        const db = await database.getClient();

        // Ensure table exists
        const hasTable = await db.schema.hasTable('kafka_topology');
        if (!hasTable) {
          await db.schema.createTable('kafka_topology', function(table) {
            table.increments('id').primary();
            table.string('context').notNullable();
            table.text('topics').notNullable(); // Store as JSON string
            table.string('source').notNullable();
            table.string('path').notNullable();
            table.timestamp('updated_at').defaultTo(db.fn.now());
          });
          logger.info('Created kafka_topology table');
        }

        // GET /kafka-topology: fetch all topology data from DB
        router.get('/', async (_req, res) => {
          try {
            const data = await db('kafka_topology').select('*');
            res.json(data);
          } catch (e) {
            logger.error('Failed to fetch Kafka topology data', e as Error);
            res.status(500).json({ error: 'Failed to fetch Kafka topology data' });
          }
        });

        // POST /kafka-topology/refresh: fetch from GitHub, update DB
        router.post('/refresh', async (_req, res) => {
          try {
            // Read config from app-config.yaml
            const githubConfig: GitHubConfig = {
              owner: config.getOptionalString('integrations.kafkaTopology.githubOwner') || '',
              repo: config.getOptionalString('integrations.kafkaTopology.githubRepo') || '',
              branch: config.getOptionalString('integrations.kafkaTopology.githubBranch') || 'master',
              path: config.getOptionalString('integrations.kafkaTopology.githubPath') || '',
              token: config.getOptionalString('integrations.kafkaTopology.githubToken') || '',
            };
            
            if (!githubConfig.owner || !githubConfig.repo || !githubConfig.path || !githubConfig.token) {
              return res.status(400).json({ error: 'Missing GitHub config in app-config.yaml' });
            }

            // Fetch from GitHub
            logger.info('Fetching Kafka topology from GitHub', { owner: githubConfig.owner, repo: githubConfig.repo });
            const contexts: KafkaTopologyContext[] = await fetchKafkaTopologyFromGitHub(githubConfig);
            
            // Clear and update DB
            await db('kafka_topology').del();
            for (const ctx of contexts) {
              await db('kafka_topology').insert({
                context: ctx.context,
                topics: JSON.stringify(ctx.topics),
                source: ctx.source,
                path: ctx.path,
                updated_at: new Date().toISOString(),
              });
            }
            
            logger.info(`Refreshed Kafka topology data from GitHub: ${contexts.length} contexts`);
            return res.json({ message: 'Kafka topology data refreshed from GitHub', count: contexts.length });
          } catch (e) {
            logger.error('Failed to refresh Kafka topology data', e as Error);
            return res.status(500).json({ 
              error: 'Failed to refresh Kafka topology data', 
              details: (e as Error).message 
            });
          }
        });

        logger.info('Kafka topology HTTP plugin initialized with / and /refresh endpoints');
        http.use(router);
        http.addAuthPolicy({
          path: '/',
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
