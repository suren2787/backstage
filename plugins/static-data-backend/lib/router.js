"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaticDataRouter = createStaticDataRouter;
const express_1 = __importDefault(require("express"));
const provider_1 = require("./provider");
async function createStaticDataRouter(options) {
    const router = express_1.default.Router();
    const provider = new provider_1.StaticDataProvider({
        logger: options.logger,
        github: { repo: options.githubRepo, token: options.token, branch: options.branch },
        writeToCatalog: options.writeToCatalog,
    });
    router.post('/refresh', async (_req, res) => {
        const result = await provider.refresh();
        res.status(200).json(result);
    });
    return router;
}
