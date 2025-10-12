export interface GitHubConfig {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
  token?: string;
}

export interface GitHubTopicFile {
  context: string;
  content: string;
  path: string;
}

export class GitHubTopicLoader {
  private config: GitHubConfig;
  private baseUrl: string;

  constructor(config: GitHubConfig) {
    this.config = { ...config };
    // Use full backend proxy URL for frontend requests
    const backendProxy = typeof window !== 'undefined'
      ? 'http://localhost:7007/api/proxy/github-api'
      : '/api/proxy/github-api';
    this.baseUrl = `${backendProxy}/repos/${this.config.owner}/${this.config.repo}`;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    // No Authorization header needed; proxy injects it
    return headers;
  }

  /**
   * Fetch all topic files from GitHub repository
   */
  async fetchTopicFiles(): Promise<GitHubTopicFile[]> {
    try {
      console.log('[GitHubLoader] Config:', this.config);
      console.log('[GitHubLoader] Base URL:', this.baseUrl);
      // Get directory contents
  const contentsUrl = `${this.baseUrl}/contents/${this.config.path}?ref=${this.config.branch}`;
  console.log('[GitHubLoader] Fetching contracts directory. URL:', contentsUrl);
      const response = await fetch(contentsUrl, {
        headers: this.getHeaders(),
      });
      console.log('[GitHubLoader] Directory fetch response:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GitHubLoader] Directory fetch failed:`, errorText);
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const contents = await response.json();
      console.log('[GitHubLoader] Directory contents:', contents);
      if (!Array.isArray(contents)) {
        console.error('[GitHubLoader] Directory contents not array:', contents);
        throw new Error('Expected directory contents but got single file');
      }

      // Filter for directories (bounded contexts)
      const contextDirs = contents.filter((item: any) => item.type === 'dir');

      const topicFiles: GitHubTopicFile[] = [];

      for (const dir of contextDirs) {
  const contextUrl = `${this.baseUrl}/contents/${this.config.path}/${dir.name}?ref=${this.config.branch}`;
  console.log(`[GitHubLoader] Listing files for context '${dir.name}'. URL:`, contextUrl);
        try {
          const contextResponse = await fetch(contextUrl, {
            headers: this.getHeaders(),
          });
          console.log(`[GitHubLoader] Context fetch response for '${dir.name}':`, contextResponse.status, contextResponse.statusText);
          if (!contextResponse.ok) {
            const errorText = await contextResponse.text();
            console.warn(`[GitHubLoader] Failed to list files for context '${dir.name}' (status ${contextResponse.status}): ${contextUrl} - ${errorText}`);
            continue;
          }
          const contextFiles = await contextResponse.json();
          console.log(`[GitHubLoader] Context files for '${dir.name}':`, contextFiles);
          // Find topics.yaml in the context directory
          const topicsFile = contextFiles.find((item: any) => item.type === 'file' && item.name === 'topics.yaml');
          if (topicsFile) {
            console.log(`[GitHubLoader] Found topics.yaml for context '${dir.name}':`, topicsFile.download_url);
          }
          if (topicsFile && topicsFile.download_url) {
            console.log(`[GitHubLoader] Fetching topics.yaml for context '${dir.name}'. URL:`, topicsFile.download_url);
            const topicsResponse = await fetch(topicsFile.download_url, {
              headers: this.getHeaders(),
            });
            console.log(`[GitHubLoader] topics.yaml fetch response for '${dir.name}':`, topicsResponse.status, topicsResponse.statusText);
            if (topicsResponse.ok) {
              const content = await topicsResponse.text();
              topicFiles.push({
                context: dir.name,
                content,
                path: `${this.config.path}/${dir.name}/topics.yaml`,
              });
            } else {
              const errorText = await topicsResponse.text();
              console.warn(`[GitHubLoader] topics.yaml not found for context '${dir.name}' (status ${topicsResponse.status}): ${topicsFile.download_url} - ${errorText}`);
            }
          } else {
            console.warn(`[GitHubLoader] topics.yaml not found in context '${dir.name}'`);
          }
        } catch (error) {
          console.warn(`[GitHubLoader] Error fetching topics for context '${dir.name}':`, error);
        }
      }

      return topicFiles;
    } catch (error) {
      console.error('Failed to fetch GitHub topic files:', error);
      throw error;
    }
  }

  /**
   * Fetch topics for a specific context
   */
  async fetchContextTopics(context: string): Promise<GitHubTopicFile | null> {
    try {
      const topicsUrl = `${this.baseUrl}/contents/${this.config.path}/${context}/topics.yaml?ref=${this.config.branch}`;
      const response = await fetch(topicsUrl, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const content = atob(data.content);
      
      return {
        context,
        content,
        path: `${this.config.path}/${context}/topics.yaml`,
      };
    } catch (error) {
      console.warn(`Failed to fetch topics for context ${context}:`, error);
      return null;
    }
  }
}