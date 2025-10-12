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
					{/* Node type legend */}
					<div style={{ position: 'absolute', top: 10, right: 10, background: '#fff', border: '1px solid #eee', padding: 8, borderRadius: 4, zIndex: 10 }}>
						<strong>Legend:</strong>
						<ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
							<li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
								<span style={{ width: 24, height: 24, background: '#fffbe6', border: '2px solid #fbc02d', borderRadius: 8, display: 'inline-block', marginRight: 8 }}></span>
								<span><strong>Topic</strong></span>
							</li>
							<li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
								<span style={{ width: 24, height: 24, background: '#e3f2fd', border: '2px solid #1976d2', borderRadius: 20, display: 'inline-block', marginRight: 8 }}></span>
								<span>Service</span>
							</li>
							<li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
								<span style={{ width: 32, height: 4, background: '#e74c3c', display: 'inline-block', marginRight: 8 }}></span>
								<span>Produces</span>
							</li>
							<li style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
								<span style={{ width: 32, height: 4, background: '#1976d2', display: 'inline-block', marginRight: 8 }}></span>
								<span>Consumes</span>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</ReactFlowProvider>
	);
};