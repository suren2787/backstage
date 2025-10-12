import { ContextTopics } from './scanContexts';
// import { KafkaTopic } from './parseTopics';

export type GraphNode = {
  id: string;
  label: string;
  type: 'topic' | 'service';
  context?: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: 'produces' | 'consumes';
  context?: string;
};

export type KafkaTopologyGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};
/**
 * Builds a relationship graph from multiple bounded contexts.
 * Each context's topics/services are grouped, and cross-context relationships are visible.
 */
export function buildKafkaTopologyGraphFromContexts(contexts: ContextTopics[]): KafkaTopologyGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const serviceSet = new Set<string>();

  for (const { context, topics } of contexts) {
    for (const topic of topics) {
      // Topic node with context and partition count
      nodes.push({ id: `${context}:${topic.name}`, label: topic.name, type: 'topic', context });
      
      // Track all producers/consumers as services (with context) - with safety checks
      if (topic.producers && Array.isArray(topic.producers)) {
        topic.producers.forEach((svc: string) => serviceSet.add(`${context}:${svc}`));
      }
      
      if (topic.consumers && Array.isArray(topic.consumers)) {
        topic.consumers.forEach((svc: string) => serviceSet.add(`${context}:${svc}`));
      }
    }
  }

  // Add service nodes
  for (const svc of serviceSet) {
    const [context, name] = svc.split(':');
    nodes.push({ id: svc, label: name, type: 'service', context });
  }

  // Add edges for producers and consumers
  for (const { context, topics } of contexts) {
    for (const topic of topics) {
      // Add producer edges with safety checks
      if (topic.producers && Array.isArray(topic.producers)) {
        topic.producers.forEach((svc: string) => {
          edges.push({
            id: `produce:${context}:${svc}->${context}:${topic.name}`,
            source: `${context}:${svc}`,
            target: `${context}:${topic.name}`,
            type: 'produces' as const,
            context,
          });
        });
      }
      
      // Add consumer edges with safety checks
      if (topic.consumers && Array.isArray(topic.consumers)) {
        topic.consumers.forEach((svc: string) => {
          edges.push({
            id: `consume:${context}:${topic.name}->${context}:${svc}`,
            source: `${context}:${topic.name}`,
            target: `${context}:${svc}`,
            type: 'consumes' as const,
            context,
          });
        });
      }
    }
  }
  
  return { nodes, edges };
}
