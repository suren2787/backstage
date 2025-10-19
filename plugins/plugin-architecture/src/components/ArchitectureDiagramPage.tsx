import React, { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider, useReactFlow } from 'react-flow-renderer';
import { adaptContextMapToKafkaGraph } from '../adapter';
import { getDagreLayoutNodes, getEnrichedEdges } from '../layout';

interface ContextDetail {
  id: string;
  name: string;
  components: any[];
  providedApis: any[];
  consumedApis: any[];
  team?: string;
  sourceUrl?: string;
}

const DiagramContent: React.FC<{ 
  graph: any; 
  contextMap: any;
  onNodeClick: (context: ContextDetail) => void;
  filterContextId?: string | null;
}> = ({ graph, contextMap, onNodeClick, filterContextId }) => {
  const { fitView } = useReactFlow();

  React.useEffect(() => {
    // Small delay to ensure nodes are rendered before fitting
    const timer = setTimeout(() => fitView({ padding: 0.2 }), 150);
    return () => clearTimeout(timer);
  }, [fitView, graph, filterContextId]);

  // Filter nodes and edges based on selected context
  let filteredNodes = graph.nodes;
  let filteredEdges = graph.edges;

  if (filterContextId) {
    const relatedContextIds = new Set<string>([filterContextId]);
    
    // Find all contexts related to the selected one
    graph.edges.forEach((edge: any) => {
      if (edge.source === filterContextId) {
        relatedContextIds.add(edge.target);
      }
      if (edge.target === filterContextId) {
        relatedContextIds.add(edge.source);
      }
    });

    // Filter edges first to only show relationships with selected context
    const relevantEdges = graph.edges.filter((edge: any) => 
      (edge.source === filterContextId || edge.target === filterContextId)
    );

    // Get unpositioned nodes for recalculation
    const unpositionedNodes = graph.nodes
      .filter((node: any) => relatedContextIds.has(node.id))
      .map((node: any) => {
        const isSelected = node.id === filterContextId;
        return {
          id: node.id,
          label: node.label, // Preserve label
          context: node.context, // Preserve context
          data: node.data, // Preserve data
          type: node.type,
          metadata: node.metadata,
          // Reset position for fresh layout
          position: { x: 0, y: 0 },
          style: {
            ...node.style,
            opacity: 1,
            border: isSelected ? '3px solid #1565c0' : '2px solid #0c5460',
            boxShadow: isSelected ? '0 0 12px rgba(21, 101, 192, 0.6)' : 'none',
            background: isSelected ? '#bbdefb' : '#d1ecf1',
            fontWeight: isSelected ? 'bold' : '500',
          },
        };
      });

    // Recalculate Dagre layout specifically for this filtered subset
    // getDagreLayoutNodes will set proper positions and preserve data properties
    filteredNodes = getDagreLayoutNodes({ nodes: unpositionedNodes, edges: relevantEdges });
    
    // Re-enrich filtered edges to recalculate bidirectional detection
    filteredEdges = getEnrichedEdges(relevantEdges, contextMap.relationships);
  } else {
    // When not filtering, ensure all nodes have proper default styling
    filteredNodes = graph.nodes.map((node: any) => ({
      ...node,
      style: {
        ...node.style,
        border: node.style?.border || '2px solid #0c5460',
        background: node.style?.background || '#d1ecf1',
      },
    }));
  }

  const handleNodeClick = (_event: any, node: any) => {
    const context = contextMap.contexts.find((c: any) => c.id === node.id);
    if (context) {
      onNodeClick(context);
    }
  };

  return (
    <ReactFlow 
      nodes={filteredNodes} 
      edges={filteredEdges}
      onNodeClick={handleNodeClick}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
};

export const ArchitectureDiagramPage: React.FC = () => {
  const [graph, setGraph] = useState<any | null>(null);
  const [contextMap, setContextMap] = useState<any | null>(null);
  const [selectedContext, setSelectedContext] = useState<ContextDetail | null>(null);
  const [filterContextId, setFilterContextId] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use environment variable for backend URL in dev; production config through app-config.yaml
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:7007';
      const res = await fetch(`${backendUrl}/api/architecture/context-map`);
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        const snippet = text.slice(0, 1024);
        throw new Error(`Expected JSON but received '${contentType}'. Response snippet:\n${snippet}`);
      }
      const payload = await res.json();
      setContextMap(payload);
      const adapted = adaptContextMapToKafkaGraph(payload);
      const nodes = getDagreLayoutNodes(adapted as any);
      const edges = getEnrichedEdges(adapted.edges, payload.relationships);
      setGraph({ nodes, edges });
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Diagram */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', backgroundColor: '#333', color: '#fff' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>Architecture Diagram</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
            Click on a context to view details
          </p>
        </div>
        
        {error && (
          <div style={{ padding: '16px', backgroundColor: '#ffebee', color: '#c62828', borderBottom: '1px solid #ef5350' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {loading && (
          <div style={{ padding: '16px', backgroundColor: '#e3f2fd', color: '#1565c0' }}>
            Loading architecture diagram...
          </div>
        )}
        
        {graph && contextMap && (
          <div style={{ flex: 1, position: 'relative' }}>
            <ReactFlowProvider>
              <DiagramContent 
                graph={graph} 
                contextMap={contextMap}
                onNodeClick={setSelectedContext}
                filterContextId={filterContextId}
              />
            </ReactFlowProvider>
          </div>
        )}
      </div>

      {/* Details Panel */}
      <div style={{
        width: '350px',
        backgroundColor: '#fff',
        borderLeft: '1px solid #ddd',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Filter Section */}
        {contextMap && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 600, color: '#333', textTransform: 'uppercase' }}>
              Filter Context
            </h3>
            <input
              type="text"
              placeholder="Search contexts..."
              value={filterSearch}
              onChange={(e) => {
                const searchValue = e.target.value;
                setFilterSearch(searchValue);
                // Only filter if there's actual search text
                if (searchValue.trim()) {
                  const searchLower = searchValue.toLowerCase();
                  
                  // Try exact match first
                  let filtered = contextMap.contexts.find((c: any) => 
                    c.name.toLowerCase() === searchLower
                  );
                  
                  // Then try case-insensitive exact match on ID
                  if (!filtered) {
                    filtered = contextMap.contexts.find((c: any) => 
                      c.id.toLowerCase() === searchLower
                    );
                  }
                  
                  // Then try starts-with match (prefix)
                  if (!filtered) {
                    filtered = contextMap.contexts.find((c: any) => 
                      c.name.toLowerCase().startsWith(searchLower) || 
                      c.id.toLowerCase().startsWith(searchLower)
                    );
                  }
                  
                  // Finally try substring match
                  if (!filtered) {
                    filtered = contextMap.contexts.find((c: any) => 
                      c.name.toLowerCase().includes(searchLower) ||
                      c.id.toLowerCase().includes(searchLower)
                    );
                  }
                  
                  setFilterContextId(filtered ? filtered.id : null);
                } else {
                  // Clear filter if search is empty
                  setFilterContextId(null);
                }
                setSelectedContext(null);
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                boxSizing: 'border-box',
                marginBottom: '8px',
              }}
            />
            {filterSearch && (
              <>
                <button
                  onClick={() => {
                    setFilterSearch('');
                    setFilterContextId(null);
                    setSelectedContext(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#666',
                    marginBottom: '8px',
                  }}
                >
                  Clear Filter
                </button>
                {filterContextId && graph && (
                  <div style={{ 
                    padding: '8px', 
                    backgroundColor: '#e8f5e9', 
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#2e7d32',
                    border: '1px solid #c8e6c9',
                  }}>
                    <strong>✓ Active Filter:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {(() => {
                        const relatedIds = new Set<string>([filterContextId]);
                        graph.edges.forEach((edge: any) => {
                          if (edge.source === filterContextId) relatedIds.add(edge.target);
                          if (edge.target === filterContextId) relatedIds.add(edge.source);
                        });
                        return `Showing ${relatedIds.size} context(s) total (${relatedIds.size - 1} related)`;
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {selectedContext ? (
          <>
            <div style={{ padding: '16px', borderBottom: '1px solid #ddd' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>
                {selectedContext.name}
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                ID: {selectedContext.id}
              </p>
              {selectedContext.team && (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                  <strong>Team:</strong> {selectedContext.team}
                </p>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Components */}
              {selectedContext.components && selectedContext.components.length > 0 && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#333' }}>
                    Components ({selectedContext.components.length})
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px' }}>
                    {selectedContext.components.map((comp: any, idx: number) => (
                      <li key={idx} style={{ marginBottom: '4px', color: '#666' }}>
                        <strong>{comp.name}</strong>
                        <br />
                        <span style={{ fontSize: '11px', color: '#999' }}>
                          Type: {comp.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Provided APIs */}
              {selectedContext.providedApis && selectedContext.providedApis.length > 0 && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#2e7d32' }}>
                    Provided APIs ({selectedContext.providedApis.length})
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px' }}>
                    {selectedContext.providedApis.map((api: any, idx: number) => (
                      <li key={idx} style={{ marginBottom: '4px', color: '#2e7d32' }}>
                        {api.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Consumed APIs */}
              {selectedContext.consumedApis && selectedContext.consumedApis.length > 0 && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#1565c0' }}>
                    Consumed APIs ({selectedContext.consumedApis.length})
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px' }}>
                    {selectedContext.consumedApis.map((api: any, idx: number) => (
                      <li key={idx} style={{ marginBottom: '4px', color: '#1565c0' }}>
                        {api.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Source URL */}
              {selectedContext.sourceUrl && (
                <div style={{ padding: '12px 16px' }}>
                  <a 
                    href={selectedContext.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: '#1976d2', textDecoration: 'none' }}
                  >
                    → View on GitHub
                  </a>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #ddd' }}>
              <button
                onClick={() => setSelectedContext(null)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#333',
                }}
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: '#999',
            fontSize: '12px',
            textAlign: 'center',
            padding: '16px',
          }}>
            Click on a bounded context to view details
          </div>
        )}
      </div>
    </div>
  );
};
