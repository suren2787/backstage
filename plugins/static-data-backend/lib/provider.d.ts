import { Logger } from 'winston';
import { GitHubConfig } from './fetcher';
export type StaticDataProviderOptions = {
    logger: Logger;
    github: GitHubConfig;
    writeToCatalog?: boolean;
    files?: {
        applications?: string;
        squads?: string;
        boundedContexts?: string;
    };
};
export declare class StaticDataProvider {
    private readonly opts;
    private readonly ajv;
    constructor(opts: StaticDataProviderOptions);
    refresh(): Promise<{
        imported: number;
        errors: string[];
    }>;
}
