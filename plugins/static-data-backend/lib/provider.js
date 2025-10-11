"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticDataProvider = void 0;
const ajv_1 = __importDefault(require("ajv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fetcher_1 = require("./fetcher");
const schemas_1 = require("./schemas");
const transformer_1 = require("./transformer");
class StaticDataProvider {
    opts;
    ajv = new ajv_1.default();
    constructor(opts) {
        this.opts = opts;
    }
    async refresh() {
        const { logger, github, writeToCatalog } = this.opts;
        const errors = [];
        let imported = 0;
        try {
            const appsRaw = await (0, fetcher_1.fetchFileFromGitHub)(github, this.opts.files?.applications ?? 'data/applications.json');
            const squadsRaw = await (0, fetcher_1.fetchFileFromGitHub)(github, this.opts.files?.squads ?? 'data/squads.json');
            const bcsRaw = await (0, fetcher_1.fetchFileFromGitHub)(github, this.opts.files?.boundedContexts ?? 'data/bounded-contexts.json');
            const apps = JSON.parse(appsRaw);
            const squads = JSON.parse(squadsRaw);
            const bcs = JSON.parse(bcsRaw);
            const validateApp = this.ajv.compile(schemas_1.applicationSchema);
            const validateSquad = this.ajv.compile(schemas_1.squadSchema);
            const validateBc = this.ajv.compile(schemas_1.boundedContextSchema);
            const entities = [];
            for (const a of apps) {
                if (!validateApp(a)) {
                    errors.push(`application ${JSON.stringify(a)} failed validation`);
                    continue;
                }
                entities.push((0, transformer_1.applicationToComponent)(a));
            }
            for (const s of squads) {
                if (!validateSquad(s)) {
                    errors.push(`squad ${JSON.stringify(s)} failed validation`);
                    continue;
                }
                entities.push((0, transformer_1.squadToGroup)(s));
            }
            for (const d of bcs) {
                if (!validateBc(d)) {
                    errors.push(`boundedContext ${JSON.stringify(d)} failed validation`);
                    continue;
                }
                entities.push((0, transformer_1.boundedContextToDomain)(d));
            }
            logger.info(`StaticDataProvider: parsed ${entities.length} entities`);
            if (writeToCatalog) {
                try {
                    const outDir = process.env.STATIC_DATA_OUT_DIR || path_1.default.resolve(process.cwd(), 'static-data-out');
                    if (!fs_1.default.existsSync(outDir))
                        fs_1.default.mkdirSync(outDir, { recursive: true });
                    const outPath = path_1.default.join(outDir, `entities-${Date.now()}.json`);
                    fs_1.default.writeFileSync(outPath, JSON.stringify(entities, null, 2), 'utf8');
                    logger.info(`StaticDataProvider: wrote ${entities.length} entities to ${outPath}`);
                }
                catch (e) {
                    errors.push(`failed to write entities file: ${e.message ?? String(e)}`);
                }
            }
            imported = entities.length;
        }
        catch (e) {
            errors.push(e.message ?? String(e));
        }
        return { imported, errors };
    }
}
exports.StaticDataProvider = StaticDataProvider;
