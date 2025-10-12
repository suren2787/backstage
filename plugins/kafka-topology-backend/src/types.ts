export interface KafkaTopologyContext {
  context: string;
  topics: any[];
  source: string;
  path: string;
  updated_at?: string;
}
