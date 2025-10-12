import { StaticDataEntityProvider } from './catalogProvider';
import { createBackendModule } from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { coreServices } from '@backstage/backend-plugin-api';

// Store provider instance globally so the HTTP plugin can access it
let providerInstance: StaticDataEntityProvider | undefined;

export function getProviderInstance(): StaticDataEntityProvider | undefined {
  return providerInstance;
}

// Catalog module for entity provider
export default createBackendModule({
  pluginId: 'catalog',
  moduleId: 'static-data',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ catalog, logger, config }) {
        // Read configuration from app-config.yaml
        const staticDataConfig = config.getOptionalConfig('staticData');
        const githubConfig = staticDataConfig?.getOptionalConfig('github');
        
        const repo = githubConfig?.getOptionalString('repo') || process.env.STATIC_DATA_REPO || 'suren2787/static-data';
        const token = githubConfig?.getOptionalString('token') || process.env.STATIC_DATA_GITHUB_TOKEN;
        const branch = githubConfig?.getOptionalString('branch') || process.env.STATIC_DATA_BRANCH || 'master';

        if (!token) {
          logger.warn('StaticDataEntityProvider: GitHub token not configured. Provider will not be registered.');
          return;
        }

        // Create entity provider
        providerInstance = new StaticDataEntityProvider(
          logger as any,
          {
            repo,
            token,
            branch,
          }
        );

        // Register with catalog
        catalog.addEntityProvider(providerInstance);
        logger.info(`StaticDataEntityProvider registered with catalog (repo: ${repo}, branch: ${branch})`);
      },
    });
  },
});
