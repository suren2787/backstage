// Utility to fetch Kafka topology YAML files from GitHub
import fetch from 'node-fetch';
import * as yaml from 'js-yaml';
import { KafkaTopologyContext } from './types';

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
}

export async function fetchKafkaTopologyFromGitHub(config: GitHubConfig): Promise<KafkaTopologyContext[]> {
  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (config.token) headers['Authorization'] = `token ${config.token}`;

  const res = await fetch(apiUrl, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  const items = await res.json();

  const contexts: KafkaTopologyContext[] = [];
  
  // Iterate through directories and subdirectories
  for (const item of items) {
    if (item.type === 'dir') {
      // This is a subdirectory (e.g., creditcards, payments, etc.)
      const subDirUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${item.path}?ref=${config.branch}`;
      const subDirRes = await fetch(subDirUrl, { headers });
      if (!subDirRes.ok) continue;
      
      const subDirItems = await subDirRes.json();
      
      // Look for topics.yaml in this subdirectory
      for (const subItem of subDirItems) {
        if (subItem.type === 'file' && subItem.name === 'topics.yaml') {
          const fileRes = await fetch(subItem.download_url, { headers });
          if (!fileRes.ok) continue;
          
          const content = await fileRes.text();
          try {
            const topics = yaml.load(content);
            contexts.push({
              context: item.name, // Use directory name as context (e.g., 'creditcards')
              topics: Array.isArray(topics) ? topics : [topics],
              source: 'github',
              path: subItem.path,
            });
          } catch (error) {
            console.error(`Failed to parse YAML for context ${item.name}:`, error);
          }
        }
      }
    } else if (item.type === 'file' && item.name.endsWith('.yaml')) {
      // Direct YAML file in the contracts directory
      const fileRes = await fetch(item.download_url, { headers });
      if (!fileRes.ok) continue;
      
      const content = await fileRes.text();
      try {
        const topics = yaml.load(content);
        contexts.push({
          context: item.name.replace(/\.yaml$/, ''),
          topics: Array.isArray(topics) ? topics : [topics],
          source: 'github',
          path: item.path,
        });
      } catch (error) {
        console.error(`Failed to parse YAML for file ${item.name}:`, error);
      }
    }
  }
  
  return contexts;
}
