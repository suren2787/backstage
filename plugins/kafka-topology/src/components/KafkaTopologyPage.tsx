import React, { useEffect, useState } from 'react';
import { useApi, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { buildKafkaTopologyGraphFromContexts, KafkaTopologyGraph } from '../buildGraph';
import { TopologyDiagram } from './TopologyDiagram';
import { KafkaTopologyApi, KafkaTopologyContext } from '../api/kafkaTopologyApi';

export const KafkaTopologyPage: React.FC = () => {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const kafkaTopologyApi = new KafkaTopologyApi(discoveryApi, fetchApi);
  
  const [allContexts, setAllContexts] = useState<KafkaTopologyContext[]>([]);
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [graph, setGraph] = useState<KafkaTopologyGraph | null>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Add CSS for loading animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Load contexts from backend API
  const loadContexts = async () => {
    setLoading(true);
    setError(null);
    try {
      const contexts = await kafkaTopologyApi.getTopologyData();
      setAllContexts(contexts);
      if (contexts.length > 0) {
        setSelectedContext(contexts[0].context);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load contexts from backend';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data from GitHub to backend DB
  const refreshFromGitHub = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await kafkaTopologyApi.refreshTopologyData();
      // Reload contexts after refresh
      await loadContexts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data from GitHub';
      setError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

  // Load contexts on component mount
  useEffect(() => {
    loadContexts();
  }, []);

  // Update graph when context or filter changes
  useEffect(() => {
    if (!selectedContext || allContexts.length === 0) return;
    const ctxObj = allContexts.find(ctx => ctx.context === selectedContext);
    if (ctxObj) {
      let filteredTopics = ctxObj.topics;
      if (topicFilter.trim()) {
        filteredTopics = filteredTopics.filter((t: any) => 
          t.name.toLowerCase().includes(topicFilter.trim().toLowerCase())
        );
      }
      setTopics(filteredTopics);
      setGraph(buildKafkaTopologyGraphFromContexts([{ ...ctxObj, topics: filteredTopics }]));
    }
  }, [selectedContext, allContexts, topicFilter]);

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      minHeight: '100vh', 
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white', 
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>🔗</div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>Kafka Topology</h1>
            </div>
            <button
              onClick={refreshFromGitHub}
              disabled={refreshing || loading}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                cursor: refreshing || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {refreshing ? (
                <>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Refreshing...
                </>
              ) : (
                <>
                  🔄 Refresh from GitHub
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '32px' }}>
          {error && (
            <div style={{ 
              background: '#fee2e2', 
              color: '#991b1b', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '18px' }}>⚠️</span>
              <strong>Error:</strong> {error}
            </div>
          )}

          {loading && (
            <div style={{ 
              background: '#dbeafe', 
              color: '#1e40af', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px',
              border: '1px solid #93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                border: '2px solid #93c5fd',
                borderTop: '2px solid #1e40af',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Loading contexts from backend...
            </div>
          )}

          {/* Controls Section */}
          <div style={{ 
            background: '#f8fafc',
            padding: '24px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>🏗️</span>
                <label htmlFor="context-select" style={{ fontWeight: '600', color: '#374151' }}>Context:</label>
                <select
                  id="context-select"
                  value={selectedContext}
                  onChange={e => setSelectedContext(e.target.value)}
                  disabled={loading}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    fontSize: '14px',
                    minWidth: '180px',
                    cursor: 'pointer'
                  }}
                >
                  {allContexts.length === 0 ? (
                    <option value="">No contexts loaded</option>
                  ) : (
                    allContexts.map(ctx => (
                      <option key={ctx.context} value={ctx.context}>
                        {ctx.context}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>🔍</span>
                <label htmlFor="topic-filter" style={{ fontWeight: '600', color: '#374151' }}>Filter:</label>
                <input
                  id="topic-filter"
                  type="text"
                  value={topicFilter}
                  onChange={e => setTopicFilter(e.target.value)}
                  placeholder="Search topics..."
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    minWidth: '200px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  disabled={loading}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {allContexts.length > 0 && (
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Data source: {allContexts.find(ctx => ctx.context === selectedContext)?.source || 'unknown'}
                </div>
              )}
            </div>
          </div>

          {/* Topology Diagram */}
          <div style={{
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            minHeight: '600px'
          }}>
            {graph ? (
              <TopologyDiagram 
                graph={graph} 
                topics={topics} 
              />
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '400px',
                color: '#6b7280',
                fontSize: '16px'
              }}>
                📊 {allContexts.length === 0 ? 'No topology data available - try refreshing from GitHub' : 'Select a context to view topology'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};