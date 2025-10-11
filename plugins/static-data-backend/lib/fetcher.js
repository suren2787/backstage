"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFileFromGitHub = fetchFileFromGitHub;
const rest_1 = require("@octokit/rest");
async function fetchFileFromGitHub(github, path) {
    const [owner, repo] = github.repo.split('/');
    const octokit = new rest_1.Octokit({ auth: github.token });
    const res = await octokit.repos.getContent({ owner, repo, path, ref: github.branch ?? 'main' });
    // @ts-ignore
    return Array.isArray(res.data) ? '' : Buffer.from(res.data.content, 'base64').toString('utf8');
}
