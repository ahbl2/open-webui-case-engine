<script lang="ts">
	/**
	 * Ticket 24: Visual graph canvas – read-only node/edge rendering.
	 */
	import { createEventDispatcher } from 'svelte';
	import { computeGraphLayout } from '$lib/utils/graphLayout';
	import type { GraphNode, GraphEdge } from '$lib/apis/caseEngine';

	export let nodes: GraphNode[] = [];
	export let edges: GraphEdge[] = [];
	export let selectedNodeId: string | null = null;
	export let width = 600;
	export let height = 400;

	$: layout = nodes.length > 0
		? computeGraphLayout(nodes, edges, width, height)
		: { nodes: [], edges: [], width, height };

	$: posById = new Map(layout.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));

	const NODE_R = 16;
	const TYPE_COLORS: Record<string, string> = {
		person: '#2563eb',
		phone: '#16a34a',
		location: '#ea580c',
		event: '#9333ea'
	};

	const dispatch = createEventDispatcher<{ nodeSelect: GraphNode; clearSelection: void }>();

	function getNodeColor(type: string): string {
		return TYPE_COLORS[type] ?? '#6b7280';
	}

	function onNodeClick(node: GraphNode) {
		dispatch('nodeSelect', node);
	}

	function onBackgroundClick() {
		dispatch('clearSelection');
	}
</script>

<div class="graph-canvas overflow-hidden rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
	{#if layout.nodes.length === 0}
		<div class="flex items-center justify-center min-h-[200px] text-sm text-gray-500 dark:text-gray-400">
			No graph data available for this case.
		</div>
	{:else}
		<svg
			viewBox="0 0 {width} {height}"
			class="block w-full h-full min-h-[300px] cursor-default"
			style="max-height: 400px;"
			role="img"
			aria-label="Evidence graph"
		>
			<!-- Background: click to clear selection -->
			<rect
				width={width}
				height={height}
				fill="transparent"
				class="cursor-default"
				on:click={onBackgroundClick}
			/>
			<!-- Edges -->
			<g class="edges">
				{#each layout.edges as { id, from, to } (id)}
					{@const fromPos = posById.get(from)}
					{@const toPos = posById.get(to)}
					{#if fromPos && toPos}
						<line
							x1={fromPos.x}
							y1={fromPos.y}
							x2={toPos.x}
							y2={toPos.y}
							stroke="#9ca3af"
							stroke-width="1.5"
							stroke-opacity="0.7"
						/>
					{/if}
				{/each}
			</g>
			<!-- Nodes -->
			<g class="nodes">
				{#each layout.nodes as { id, x, y, node } (id)}
					<g
						class="cursor-pointer select-none"
						on:click|stopPropagation={() => onNodeClick(node)}
						role="button"
						tabindex="0"
						on:keydown={(e) => e.key === 'Enter' && onNodeClick(node)}
					>
						<circle
							cx={x}
							cy={y}
							r={NODE_R}
							fill={getNodeColor(node.type)}
							stroke={selectedNodeId === id ? '#1d4ed8' : '#374151'}
							stroke-width={selectedNodeId === id ? 3 : 1}
							opacity={selectedNodeId === id ? 1 : 0.9}
						/>
						<title>{node.label}</title>
						<text
							x={x}
							y={y + NODE_R + 14}
							text-anchor="middle"
							class="fill-gray-700 dark:fill-gray-300"
							font-size="11"
							font-family="system-ui, sans-serif"
						>
							{node.label.length > 12 ? node.label.slice(0, 10) + '…' : node.label}
						</text>
					</g>
				{/each}
			</g>
		</svg>
	{/if}
</div>
