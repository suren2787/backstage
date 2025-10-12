import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

export interface KafkaTopologyContext {
  id?: number;
  context: string;
  topics: any[];
  source: string;
  path: string;
  updated_at?: string;
}

export class KafkaTopologyApi {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  async getTopologyData(): Promise<KafkaTopologyContext[]> {
    const baseUrl = await this.discoveryApi.getBaseUrl('kafka-topology');
    const response = await this.fetchApi.fetch(`${baseUrl}/`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch topology data: ${response.statusText}`);
    }
    
    const data = await response.json();
    // Parse topics from JSON string if needed
    return data.map((item: any) => ({
      ...item,
      topics: typeof item.topics === 'string' ? JSON.parse(item.topics) : item.topics,
    }));
  }

  async refreshTopologyData(): Promise<{ message: string; count: number }> {
    const baseUrl = await this.discoveryApi.getBaseUrl('kafka-topology');
    const response = await this.fetchApi.fetch(`${baseUrl}/refresh`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh topology data: ${response.statusText}`);
    }
    
    return response.json();
  }
}