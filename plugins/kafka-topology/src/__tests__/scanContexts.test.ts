import { scanAndParseContexts, ContextTopics } from '../scanContexts';
import path from 'path';

describe('scanAndParseContexts', () => {
  const testContractsDir = path.resolve(__dirname, 'contracts');

  it('should return an array of context/topic objects', () => {
    const result: ContextTopics[] = scanAndParseContexts(testContractsDir);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    for (const ctx of result) {
      expect(typeof ctx.context).toBe('string');
      expect(Array.isArray(ctx.topics)).toBe(true);
    }
  });

  it('should handle missing contracts directory gracefully', () => {
    const result = scanAndParseContexts('/nonexistent/path');
    expect(result).toEqual([]);
  });
});
