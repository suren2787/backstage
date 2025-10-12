import { parseTopicsFromFile, KafkaTopic } from '../parseTopics';
import path from 'path';

describe('parseTopicsFromFile', () => {
  it('parses topics.yaml correctly', () => {
    const filePath = path.resolve(__dirname, 'topics.yaml');
    const topics: KafkaTopic[] = parseTopicsFromFile(filePath);
    expect(topics.length).toBe(2);
    expect(topics[0].name).toBe('topic1');
    expect(topics[0].producers).toEqual(['serviceA', 'serviceB']);
    expect(topics[1].consumers).toEqual(['serviceA', 'serviceF']);
  });
});
