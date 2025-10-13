import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import { Logger } from 'winston';
import { CatalogClient } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { fetchFileFromGitHub, GitHubConfig, fetchAllOpenApiDefinitionsFromContracts, fetchAndParseBuildGradle, extractOpenApiRelations } from './fetcher';
import { applicationSchema, squadSchema, boundedContextSchema } from './schemas';
import { applicationToComponent, squadToGroup, boundedContextToDomain, domainToDomain, apiJsonToApiEntity } from './transformer';

export type StaticDataProviderOptions = {
  logger: Logger;
  github: GitHubConfig;
  catalogClient?: CatalogClient;
  discoveryApi?: { getBaseUrl: (pluginId: string) => Promise<string> };
  writeToCatalog?: boolean;
  writeToFile?: boolean;
  files?: { applications?: string; squads?: string; boundedContexts?: string; domains?: string; apis?: string };
};

export class StaticDataProvider {
  private readonly ajv = new Ajv();
  constructor(private readonly opts: StaticDataProviderOptions) {}


  async refresh(): Promise<{ imported: number; errors: string[]; entities: Entity[] }> {
    const { logger, github, writeToCatalog } = this.opts;
    const errors: string[] = [];
    let imported = 0;
    const entities: Entity[] = [];


    try {
      // Load core data
      const appsRaw = await fetchFileFromGitHub(github, this.opts.files?.applications ?? 'data/applications.json');
      const squadsRaw = await fetchFileFromGitHub(github, this.opts.files?.squads ?? 'data/squads.json');
      const bcsRaw = await fetchFileFromGitHub(github, this.opts.files?.boundedContexts ?? 'data/bounded-contexts.json');
      const domainsRaw = await fetchFileFromGitHub(github, this.opts.files?.domains ?? 'data/domains.json');

      const apps = JSON.parse(appsRaw);
      const squads = JSON.parse(squadsRaw);
      const bcs = JSON.parse(bcsRaw);
      const domains = JSON.parse(domainsRaw);

      // Map bounded context name to ownerSquadId for API entity mapping
      const bcOwnerMap: Record<string, string> = {};
      for (const bc of bcs) {
        if (bc.id && bc.ownerSquadId) bcOwnerMap[bc.id] = bc.ownerSquadId;
        if (bc.name && bc.ownerSquadId) bcOwnerMap[bc.name] = bc.ownerSquadId;
      }

      // Ingest APIs from contracts openapi folders
      const openapiDefs = await fetchAllOpenApiDefinitionsFromContracts(github, 'contracts');
      for (const def of openapiDefs) {
        const apiEntity = apiJsonToApiEntity({
          id: `${def.boundedContext}-${def.api}-${def.version}`,
          name: `${def.api} (${def.version})`,
          description: `API ${def.api} for bounded context ${def.boundedContext}, version ${def.version}`,
          type: 'openapi',
          systemId: def.boundedContext,
          ownerSquadId: bcOwnerMap[def.boundedContext] || 'unknown',
          lifecycle: 'production',
          definition: def.rawYaml,
          tags: [],
          visibility: 'public',
          version: def.version,
        });
        entities.push(apiEntity);
      }

      // Validate and ingest other entities
      const validateApp = this.ajv.compile(applicationSchema as any);
      const validateSquad = this.ajv.compile(squadSchema as any);
      const validateBc = this.ajv.compile(boundedContextSchema as any);

      // Map of API entity names for quick lookup
      const apiEntityNames = new Set(entities.filter(e => e.kind === 'API').map(e => e.metadata.name));
      
      logger.info(`StaticDataProvider: Found ${apiEntityNames.size} API entities: ${Array.from(apiEntityNames).join(', ')}`);

      for (const a of apps) {
        if (!validateApp(a)) {
          errors.push(`application ${JSON.stringify(a)} failed validation`);
          continue;
        }

        // Attempt to fetch and parse build.gradle for produces/consumesApi
        // Use the new repository URL field (e.g., appAny.repository)
        let producesApi: string[] = [];
        let consumesApi: string[] = [];
        const appAny = a as any;
        logger.info(`StaticDataProvider: Processing app ${appAny.id} - url: ${appAny.url}, repo: ${appAny.repo}, githubRepo: ${appAny.githubRepo}, repository: ${appAny.repository}`);
        let repo = appAny.repository || appAny.repo || appAny.githubRepo;

        // If no repo field, try to extract from url field (e.g., https://github.com/owner/repo)
        if (!repo && appAny.url) {
          // Match full GitHub repo URLs like https://github.com/owner/repo or https://github.com/owner/repo.git
          const urlMatch = appAny.url.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?(?:$|[?#])/);
          if (urlMatch) {
            repo = urlMatch[1];
            logger.info(`StaticDataProvider: Extracted repo ${repo} from url for ${appAny.id}`);
          }
        }

        if (repo) {
          try {
            const gradle = await fetchAndParseBuildGradle(github, repo, github.branch ?? 'main', 'build.gradle');
            const rels = extractOpenApiRelations(gradle);
            logger.info(`StaticDataProvider: build.gradle for ${appAny.id} (${repo}) - extracted produces: ${JSON.stringify(rels.produces)}, consumes: ${JSON.stringify(rels.consumes)}`);
            // Only link to API entities that exist in this catalog
            producesApi = (rels.produces || []).filter(api => apiEntityNames.has(api));
            consumesApi = (rels.consumes || []).filter(api => apiEntityNames.has(api));
            logger.info(`StaticDataProvider: ${appAny.id} - filtered produces: ${JSON.stringify(producesApi)}, filtered consumes: ${JSON.stringify(consumesApi)}`);
          } catch (e: any) {
            logger.warn(`Failed to fetch/parse build.gradle for ${repo}: ${e.message || e}`);
            errors.push(`Failed to fetch/parse build.gradle for ${repo}: ${e.message || e}`);
          }
        }

        // Add providesApis and consumesApis to the app object for transformer
        const aObj = a as any;

        // Only set providesApis/consumesApis if non-empty, and use correct entity ref format
        const providesApis = producesApi
          .map(api => `API:default/${api}`)
          .filter(Boolean);
        const consumesApis = consumesApi
          .map(api => `API:default/${api}`)
          .filter(Boolean);

        if (providesApis.length > 0 || consumesApis.length > 0) {
          logger.info(`StaticDataProvider: ${aObj.id} - providesApis: ${JSON.stringify(providesApis)}, consumesApis: ${JSON.stringify(consumesApis)}`);
        }

        const appWithApis = {
          ...aObj,
          ...(providesApis.length > 0 ? { providesApis } : {}),
          ...(consumesApis.length > 0 ? { consumesApis } : {}),
        };

        // Pass to transformer
        const component = applicationToComponent(appWithApis);
        logger.info(`StaticDataProvider: Component ${component.metadata.name} spec: ${JSON.stringify(component.spec)}`);
        entities.push(component);
      }

      for (const s of squads) {
        if (!validateSquad(s)) {
          errors.push(`squad ${JSON.stringify(s)} failed validation`);
          continue;
        }
        entities.push(squadToGroup(s));
      }

      for (const d of bcs) {
        if (!validateBc(d)) {
          errors.push(`boundedContext ${JSON.stringify(d)} failed validation`);
          continue;
        }
        entities.push(boundedContextToDomain(d));
      }

      for (const dom of domains) {
        entities.push(domainToDomain(dom));
      }

      logger.info(`StaticDataProvider: parsed ${entities.length} entities`);

      // Write to catalog
      if (writeToCatalog && this.opts.catalogClient) {
        try {
          for (const entity of entities as Entity[]) {
            try {
              // Use catalog API to register/update entity
              await this.opts.catalogClient.addLocation({
                type: 'url',
                target: `static-data:${entity.metadata.namespace || 'default'}/${entity.kind}/${entity.metadata.name}`,
              }, {
                token: process.env.STATIC_DATA_GITHUB_TOKEN,
              });
              logger.debug(`Registered entity: ${entity.kind}:${entity.metadata.namespace}/${entity.metadata.name}`);
            } catch (entityError: any) {
              logger.warn(`Failed to register entity ${entity.metadata.name}: ${entityError.message}`);
              errors.push(`Failed to register ${entity.metadata.name}: ${entityError.message}`);
            }
          }
          logger.info(`StaticDataProvider: registered ${entities.length} entities in catalog`);
        } catch (e: any) {
          errors.push(`failed to write to catalog: ${e.message ?? String(e)}`);
        }
      }

      // Optionally write to file for debugging
      if (this.opts.writeToFile) {
        try {
          const outDir = process.env.STATIC_DATA_OUT_DIR || path.resolve(process.cwd(), 'static-data-out');
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          const outPath = path.join(outDir, `entities-${Date.now()}.json`);
          fs.writeFileSync(outPath, JSON.stringify(entities, null, 2), 'utf8');
          logger.info(`StaticDataProvider: wrote ${entities.length} entities to ${outPath}`);
        } catch (e: any) {
          errors.push(`failed to write entities file: ${e.message ?? String(e)}`);
        }
      }

      imported = entities.length;
    } catch (e: any) {
      const errorMsg = e.message ?? String(e);
      errors.push(errorMsg);
      logger.error(`StaticDataProvider refresh failed: ${errorMsg}`, e);
    }

    return { imported, errors, entities };
  }
}
