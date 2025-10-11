import { createStaticDataRouter } from './router';
import { createBackendPlugin, coreServices } from '@backstage/backend-plugin-api';

export default createBackendPlugin({
  pluginId: 'static-data',
  register(env) {
    env.registerInit({
      deps: {
        http: coreServices.httpRouter,
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
      },
      async init({ http, logger, httpAuth }) {
        const router = await createStaticDataRouter({
          logger: logger as any,
          httpAuth,
          githubRepo: process.env.STATIC_DATA_REPO || 'suren2787/static-data',
          token: process.env.STATIC_DATA_GITHUB_TOKEN,
          branch: process.env.STATIC_DATA_BRANCH,
          writeToCatalog: process.env.STATIC_DATA_WRITE === 'true',
        });
        
        // Use middleware: 'none' to disable authentication for this endpoint
        http.use(router);
        http.addAuthPolicy({
          path: '/refresh',
          allow: 'unauthenticated',
        });
      },
    });
  },
});
