import { Logger } from 'winston';
export type RouterOptions = {
    logger: Logger;
    githubRepo: string;
    token?: string;
    branch?: string;
    writeToCatalog?: boolean;
};
export declare function createStaticDataRouter(options: RouterOptions): Promise<import("express-serve-static-core").Router>;
