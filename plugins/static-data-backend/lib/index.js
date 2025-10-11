"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createPlugin;
const router_1 = require("./router");
async function createPlugin(env) {
    const router = await (0, router_1.createStaticDataRouter)({
        logger: env.logger,
        githubRepo: process.env.STATIC_DATA_REPO || 'suren2787/static-data',
        token: process.env.STATIC_DATA_GITHUB_TOKEN,
        branch: process.env.STATIC_DATA_BRANCH,
        writeToCatalog: process.env.STATIC_DATA_WRITE === 'true',
    });
    env.router.use('/static-data', router);
}
