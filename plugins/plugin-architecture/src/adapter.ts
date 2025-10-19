export function adaptContextMapToKafkaGraph(payload: any): { nodes: any[]; edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];

  const contexts = payload?.contexts || [];
  const relationships = payload?.relationships || payload?.links || [];

  contexts.forEach((ctx: any, idx: number) => {
    nodes.push({
      id: ctx.id || ctx.name || `ctx-${idx}`,
      label: ctx.name || ctx.id || `Context ${idx}`,
      context: ctx.id || ctx.name,
      type: 'service',
      metadata: ctx,
    });
  });

  relationships.forEach((rel: any, idx: number) => {
    // Support multiple relationship formats
    const from = rel.upstreamContext || rel.from || rel.source || rel.a;
    const to = rel.downstreamContext || rel.to || rel.target || rel.b;
    if (from && to) {
      edges.push({ 
        id: rel.id || `e-${idx}`, // Use backend relationship ID if available
        source: from, 
        target: to, 
        type: rel.type || rel.relationshipType || 'depends' 
      });
    }
  });

  return { nodes, edges };
}
