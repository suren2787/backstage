import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service';

export const kafkaTopologyModule = createBackendModule({
  pluginId: 'kafka-topology',
  moduleId: 'default',
  register(reg) {
    reg.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        config: coreServices.rootConfig,
        database: coreServices.database,
      },
      async init({ httpRouter, config, database }) {
        const router = await createRouter({
          config,
          database: await database.getClient(),
        });
        httpRouter.use(router);
      },
    });
  },
});

export default kafkaTopologyModule;
