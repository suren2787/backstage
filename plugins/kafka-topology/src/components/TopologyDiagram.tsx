import React from 'react';
import ReactFlow, { Node, Edge, Background, Controls, ReactFlowProvider, Handle, Position } from 'react-flow-renderer';
import { getDagreLayoutNodes } from './layout';
import { KafkaTopologyGraph, GraphNode, GraphEdge } from '../buildGraph';

// Generate a color for each context
function getContextColor(_: string, idx: number): string {
const palette = [
		'#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6',
		'#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3',
		'#808000', '#ffd8b1', '#000075', '#808080', '#ffffff', '#000000', '#b6b6b4', '#c2b280',
		'#ffb347', '#c0c0c0', '#b22222', '#228b22', '#4682b4', '#daa520', '#8a2be2', '#20b2aa'
	];
	return palette[idx % palette.length];
}

function toReactFlowNodes(graph: KafkaTopologyGraph, topics: any[]): Node[] {
	const nodes = getDagreLayoutNodes(graph);
	console.log('toReactFlowNodes - Input topics:', topics);
	console.log('toReactFlowNodes - Input graph nodes:', graph.nodes);
	
	return nodes.map(node => {
		if (node.type === 'default' && node.data && node.id.includes(':')) {
			// Find topic meta - try different matching strategies
			const [context, topicName] = node.id.split(':');
			console.log(`Processing node: ${node.id}, context: ${context}, topicName: ${topicName}`);
			
			// First try exact match
			let topicMeta = topics.find((t: any) => `${t.context ? t.context + ':' : ''}${t.name}` === node.id);
			console.log('Exact match result:', topicMeta);
			
			// If not found, try matching just the topic name
			if (!topicMeta) {
				topicMeta = topics.find((t: any) => t.name === topicName);
				console.log('Name-only match result:', topicMeta);
			}
			
			if (topicMeta && topicMeta.partitions) {
				node.data.partitions = topicMeta.partitions;
				node.type = 'topicNode';
				console.log(`✅ Set partitions for ${node.id}: ${topicMeta.partitions}`);
			} else {
				console.log(`❌ No partitions found for ${node.id}`, { topicMeta, hasPartitions: topicMeta?.partitions });
			}
		}
		return node;
	});
}
const TopicNode = ({ data }: { data: any }) => {
	const partitionCount = data.partitions || 1;
	return (
				<div style={{ 
					display: 'flex', 
					flexDirection: 'column', 
					alignItems: 'center', 
					width: '100%', 
					height: '100%',
					padding: '8px',
					boxSizing: 'border-box',
					justifyContent: 'center',
					position: 'relative'
				}}>
					<Handle type="target" position={Position.Left} />
					{/* Partition badge at top-right corner of node container */}
					<span style={{
						position: 'absolute',
						top: 4,
						right: 4,
						background: '#1976d2',
						color: '#fff',
						borderRadius: '12px',
						padding: '2px 8px',
						fontSize: '10px',
						fontWeight: 600,
						boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
						zIndex: 2
					}} title={`Partitions: ${partitionCount}`}>
						{partitionCount}p
					</span>
					<div style={{ 
						fontWeight: 'bold', 
						marginBottom: 2, 
						textAlign: 'center',
						fontSize: '12px',
						lineHeight: '1.2'
					}}>
						{data.label}
					</div>
					<Handle type="source" position={Position.Right} />
				</div>
	);
};

function toReactFlowEdges(graph: KafkaTopologyGraph): Edge[] {
	return graph.edges.map((edge: GraphEdge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		// Remove label for edge, legend will explain edge types
		animated: false,
		style: edge.type === 'consumes' 
			? { stroke: '#1976d2', strokeWidth: 3, strokeDasharray: '5,5' } 
			: { stroke: '#e74c3c', strokeWidth: 2 },
	}));
}


export type TopologyDiagramProps = {
	graph: KafkaTopologyGraph;
	topics: any[];
	onNodeClick?: (nodeId: string) => void;
};

export const TopologyDiagram: React.FC<TopologyDiagramProps> = ({ graph, topics, onNodeClick }) => {
	const nodes = toReactFlowNodes(graph, topics);
	const edges = toReactFlowEdges(graph);
	const nodeTypes = { topicNode: TopicNode };

	// Build context legend
	const contextList = Array.from(new Set(graph.nodes.map((n: GraphNode) => typeof n.context === 'string' ? n.context : '').filter((ctx): ctx is string => !!ctx)));
	const contextColorMap: Record<string, string> = {};
	contextList.forEach((ctx, idx) => {
		contextColorMap[String(ctx)] = getContextColor(String(ctx), idx);
	});

	function handleNodeClick(_: any, node: Node) {
		if (onNodeClick) {
			if (node.type === 'topicNode' || node.type === 'topic' || (node.type === 'default' && node.id.includes(':'))) {
				onNodeClick(node.id);
			} else {
				onNodeClick(null as any);
			}
		}
	}

		return (
			<ReactFlowProvider>
				<div style={{ display: 'flex', width: '100%', height: '600px' }}>
					<div style={{ flex: 1, position: 'relative' }}>
						<ReactFlow
							nodes={nodes}
							edges={edges}
							nodeTypes={nodeTypes}
							fitView
							onNodeClick={handleNodeClick}
						>
							<Background />
							<Controls />
						</ReactFlow>
						{/* Node type legend - moved to bottom left, improved contrast and font */}
									<div style={{ 
										position: 'absolute', 
										left: 16, 
										bottom: 16, 
										background: 'rgba(30, 41, 59, 0.97)', // slate-800 with opacity
										color: '#fff', 
										border: '1px solid #334155', 
										padding: '16px 20px', 
										borderRadius: 8, 
										zIndex: 20, 
										fontSize: '15px',
										fontWeight: 500,
										boxShadow: '0 4px 16px rgba(0,0,0,0.18)'
									}}>
										<div style={{ fontWeight: 700, fontSize: '16px', marginBottom: 8, letterSpacing: 0.5 }}>Legend</div>
										<ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
											<li style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
												{/* Topic: yellow rounded rectangle */}
												<span style={{ width: 32, height: 24, background: '#fff3cd', border: '2px solid #856404', borderRadius: 8, display: 'inline-block', marginRight: 10 }}></span>
												<span style={{ color: '#fbc02d', fontWeight: 700 }}>Topic</span>
											</li>
															<li style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
																{/* Service: blue rounded rectangle */}
																<span style={{ width: 32, height: 24, background: '#d1ecf1', border: '2px solid #0c5460', borderRadius: 8, display: 'inline-block', marginRight: 10 }}></span>
																<span style={{ color: '#60a5fa', fontWeight: 700 }}>Service</span>
															</li>
															<li style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
																{/* Produces: solid red line */}
																<span style={{ width: 32, height: 4, background: '#e74c3c', display: 'inline-block', marginRight: 10, borderRadius: 2 }}></span>
																<span style={{ color: '#f87171', fontWeight: 700 }}>Produces</span>
															</li>
															<li style={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
																{/* Consumes: dotted blue line */}
																<span style={{ width: 32, height: 4, background: 'none', borderBottom: '3px dotted #1976d2', display: 'inline-block', marginRight: 10, borderRadius: 2 }}></span>
																<span style={{ color: '#60a5fa', fontWeight: 700 }}>Consumes</span>
															</li>
										</ul>
									</div>
					</div>
				</div>
			</ReactFlowProvider>
	);
};