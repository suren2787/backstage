import { Node, Position } from 'react-flow-renderer';
import { KafkaTopologyGraph, GraphNode } from '../buildGraph';

const nodeWidth = 200;
const nodeHeight = 50;

export function getDagreLayoutNodes(graph: KafkaTopologyGraph): Node[] {
  // Kafka-aware layout: Producers -> Topics -> Consumers
  const topics = graph.nodes.filter(node => node.type === 'topic');
  const services = graph.nodes.filter(node => node.type === 'service');
  
  // Categorize services based on edge relationships
  const producers: GraphNode[] = [];
  const consumers: GraphNode[] = [];
  const mixed: GraphNode[] = [];
  
  services.forEach(service => {
    // Check if service produces (service -> topic edges with type 'produces')
    const isProducer = graph.edges.some(edge => 
      edge.type === 'produces' && edge.source === service.id
    );
    // Check if service consumes (topic -> service edges with type 'consumes')  
    const isConsumer = graph.edges.some(edge => 
      edge.type === 'consumes' && edge.target === service.id
    );
    
    if (isProducer && isConsumer) {
      mixed.push(service);
    } else if (isProducer) {
      producers.push(service);
    } else if (isConsumer) {
      consumers.push(service);
    }
  });

  const columnSpacing = 350;
  const rowSpacing = 80;
  const startY = 50;

  return graph.nodes.map((node: GraphNode) => {
    let x = 0;
    let y = 0;
    
    if (node.type === 'topic') {
      // Topics in center column
      x = columnSpacing;
      y = startY + topics.indexOf(node) * rowSpacing;
    } else if (producers.includes(node)) {
      // Pure producers on left
      x = 0;
      y = startY + producers.indexOf(node) * rowSpacing;
    } else if (consumers.includes(node)) {
      // Pure consumers on right
      x = columnSpacing * 2;
      y = startY + consumers.indexOf(node) * rowSpacing;
    } else if (mixed.includes(node)) {
      // Mixed services (producer + consumer) on left, offset down
      x = 0;
      y = startY + (producers.length + mixed.indexOf(node)) * rowSpacing;
    }

    const isTopic = node.type === 'topic';
    
    return {
      id: node.id,
      data: { label: node.label, context: node.context },
      position: { x, y },
      type: 'default',
      sourcePosition: Position.Right,  // Edges exit from right side
      targetPosition: Position.Left,   // Edges enter from left side
      style: {
        width: nodeWidth,
        height: nodeHeight,
        background: isTopic ? '#fff3cd' : '#d1ecf1',
        border: isTopic ? '2px solid #856404' : '2px solid #0c5460',
        borderRadius: 8,
        fontSize: '14px',
        fontWeight: isTopic ? 'bold' : 'normal',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
      },
    };
  });
}
