import { Node, Position, Edge } from 'react-flow-renderer';
import dagre from 'dagre';

const nodeWidth = 200;
const nodeHeight = 60;

export function getDagreLayoutNodes(graph: { nodes: any[]; edges: any[] }): Node[] {
  // Create a directed graph for Dagre layout
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 200 });

  // Add nodes to Dagre graph
  graph.nodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges to Dagre graph
  graph.edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Convert Dagre positions to React Flow nodes
  return graph.nodes.map(node => {
    const nodeWithPos = dagreGraph.node(node.id);
    return {
      id: node.id,
      data: { label: node.label || node.data?.label, context: node.context || node.data?.context },
      position: { x: nodeWithPos.x - nodeWidth / 2, y: nodeWithPos.y - nodeHeight / 2 },
      type: node.type || 'default',
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        ...(node.style || {}),
        width: nodeWidth,
        height: nodeHeight,
        background: node.style?.background || '#d1ecf1',
        border: node.style?.border || '2px solid #0c5460',
        color: '#0c5460',
        borderRadius: 8,
        fontSize: '13px',
        fontWeight: node.style?.fontWeight || '500',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    };
  });
}

/**
 * Enrich edges with labels and styling based on relationship types
 * Detects bidirectional edges and curves them so both are visible
 */
export function getEnrichedEdges(edges: any[], relationships: any[]): Edge[] {
  const relationshipMap = new Map();
  
  // Build map of relationships for quick lookup
  relationships.forEach((rel: any) => {
    const key = `${rel.upstreamContext}→${rel.downstreamContext}`;
    relationshipMap.set(key, rel);
  });

  // Track bidirectional edge pairs to curve them
  const edgePairs = new Map<string, number>();
  edges.forEach((edge: any) => {
    const key = [edge.source, edge.target].sort().join('|');
    edgePairs.set(key, (edgePairs.get(key) || 0) + 1);
  });

  return edges.map((edge: any, idx: number) => {
    const key = `${edge.source}→${edge.target}`;
    const relationship = relationshipMap.get(key);
    const relType = relationship?.relationshipType || edge.type || 'UNKNOWN';

    // Color coding based on relationship type
    let color = '#999';
    if (relType === 'SHARED_KERNEL') {
      color = '#f57c00'; // Orange for shared kernel
    } else if (relType === 'OPEN_HOST_SERVICE') {
      color = '#2e7d32'; // Green for open host
    } else if (relType === 'CUSTOMER_SUPPLIER') {
      color = '#1565c0'; // Blue for customer-supplier
    }

    // Check if this edge pair has bidirectional edges
    const pairKey = [edge.source, edge.target].sort().join('|');
    const edgeCount = edgePairs.get(pairKey) || 1;
    
    // If bidirectional (2+ edges between same nodes), use curved path
    const isBidirectional = edgeCount > 1;

    return {
      id: edge.id || `e-${idx}`, // Use existing edge.id if available, otherwise generate
      source: edge.source,
      target: edge.target,
      label: relType.replace(/_/g, ' '),
      type: isBidirectional ? 'smoothstep' : 'default', // Use smoothstep for bidirectional edges to avoid overlap
      animated: false,
      style: { stroke: color, strokeWidth: 2 },
      labelStyle: { 
        fill: color, 
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: '#fff',
        padding: '2px 4px',
        borderRadius: '2px',
      },
    };
  });
}
