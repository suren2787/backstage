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
      },
      async init({ catalog, logger }) {
        // Create entity provider
        providerInstance = new StaticDataEntityProvider(
          logger as any,
          {
            repo: process.env.STATIC_DATA_REPO || 'suren2787/static-data',
            token: process.env.STATIC_DATA_GITHUB_TOKEN,
            branch: process.env.STATIC_DATA_BRANCH || 'master',
          }
        );

        // Register with catalog
        catalog.addEntityProvider(providerInstance);
        logger.info('StaticDataEntityProvider registered with catalog');
      },
    });
  },
});
