import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import { Logger } from 'winston';
import { CatalogClient } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { fetchFileFromGitHub, GitHubConfig, fetchAllOpenApiDefinitionsFromContracts } from './fetcher';
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

      for (const a of apps) {
        if (!validateApp(a)) {
          errors.push(`application ${JSON.stringify(a)} failed validation`);
          continue;
        }
        entities.push(applicationToComponent(a));
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
      errors.push(e.message ?? String(e));
    }

    return { imported, errors, entities };
  }
}
