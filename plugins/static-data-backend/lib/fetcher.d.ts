export type GitHubConfig = {
    repo: string;
    branch?: string;
    token?: string;
};
export declare function fetchFileFromGitHub(github: GitHubConfig, path: string): Promise<string>;
