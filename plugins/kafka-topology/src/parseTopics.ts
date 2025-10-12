import fs from 'fs';
import yaml from 'js-yaml';

export type KafkaTopic = {
  name: string;
  partitions: number;
  logCompaction: boolean;
  producers: string[];
  consumers: string[];
};

export function parseTopicsFromFile(filePath: string): KafkaTopic[] {
  const yamlText = fs.readFileSync(filePath, 'utf8');
  const topics = yaml.load(yamlText) as KafkaTopic[];
  return topics;
}
