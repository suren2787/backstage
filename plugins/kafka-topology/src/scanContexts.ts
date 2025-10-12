import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface ContextTopics {
  context: string;
  topics: any[];
}

/**
 * Scans the contracts directory for all <context>/topics.yaml files and parses them.
 * Returns an array of { context, topics } objects.
 */
export function scanAndParseContexts(contractsDir: string): ContextTopics[] {
  const contexts: ContextTopics[] = [];
  if (!fs.existsSync(contractsDir)) return contexts;
  const contextDirs = fs.readdirSync(contractsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const context of contextDirs) {
    const topicsPath = path.join(contractsDir, context, 'topics.yaml');
    if (fs.existsSync(topicsPath)) {
      const fileContent = fs.readFileSync(topicsPath, 'utf8');
      try {
        const topics = yaml.load(fileContent);
        contexts.push({ context, topics: Array.isArray(topics) ? topics : [topics] });
      } catch (e) {
        // Optionally log or handle parse errors
      }
    }
  }
  return contexts;
}
