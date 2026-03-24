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
	export let selectedEdgeId: string | null = null;
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

	const dispatch = createEventDispatcher<{
		nodeSelect: GraphNode;
		edgeSelect: GraphEdge;
		clearSelection: void;
	}>();

	let scale = 1;
	let translateX = 0;
	let translateY = 0;
	let isPanning = false;
	let panStartX = 0;
	let panStartY = 0;
	let panOriginX = 0;
	let panOriginY = 0;

	const MIN_SCALE = 0.6;
	const MAX_SCALE = 2.5;

	function getNodeColor(type: string): string {
		return TYPE_COLORS[type] ?? '#6b7280';
	}

	function onNodeClick(node: GraphNode) {
		dispatch('nodeSelect', node);
	}

	function onEdgeClick(edge: GraphEdge) {
		dispatch('edgeSelect', edge);
	}

	function onBackgroundClick() {
		dispatch('clearSelection');
	}

	function resetView() {
		scale = 1;
		translateX = 0;
		translateY = 0;
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY < 0 ? 0.1 : -0.1;
		const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
		scale = Number(next.toFixed(2));
	}

	function onPointerDown(e: PointerEvent) {
		isPanning = true;
		panStartX = e.clientX;
		panStartY = e.clientY;
		panOriginX = translateX;
		panOriginY = translateY;
	}

	function onPointerMove(e: PointerEvent) {
		if (!isPanning) return;
		translateX = panOriginX + (e.clientX - panStartX);
		translateY = panOriginY + (e.clientY - panStartY);
	}

	function onPointerUp() {
		isPanning = false;
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
			class="block w-full h-full min-h-[300px] cursor-grab active:cursor-grabbing"
			style="max-height: 400px;"
			role="img"
			aria-label="Evidence graph"
			on:wheel={onWheel}
			on:pointerdown={onPointerDown}
			on:pointermove={onPointerMove}
			on:pointerup={onPointerUp}
			on:pointerleave={onPointerUp}
		>
			<!-- Background: click to clear selection -->
			<rect
				width={width}
				height={height}
				fill="transparent"
				class="cursor-default"
				on:click={onBackgroundClick}
			/>
			<g transform={`translate(${translateX} ${translateY}) scale(${scale})`}>
			<!-- Edges -->
			<g class="edges">
				{#each layout.edges as { id, from, to, edge } (id)}
					{@const fromPos = posById.get(from)}
					{@const toPos = posById.get(to)}
					{#if fromPos && toPos}
						<line
							x1={fromPos.x}
							y1={fromPos.y}
							x2={toPos.x}
							y2={toPos.y}
							stroke="transparent"
							stroke-width="10"
							class="cursor-pointer"
							on:click|stopPropagation={() => onEdgeClick(edge)}
						/>
						<line
							x1={fromPos.x}
							y1={fromPos.y}
							x2={toPos.x}
							y2={toPos.y}
							stroke={selectedEdgeId === id ? '#2563eb' : '#9ca3af'}
							stroke-width={selectedEdgeId === id ? 2.5 : 1.5}
							stroke-opacity={selectedEdgeId === id ? 0.95 : 0.7}
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
			</g>
		</svg>
		<div class="flex items-center justify-between px-2 py-1 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400">
			<span>Pan: drag canvas. Zoom: mouse wheel.</span>
			<button
				type="button"
				class="rounded border border-gray-300 dark:border-gray-700 px-2 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
				on:click={resetView}
			>
				Reset view
			</button>
		</div>
	{/if}
</div>
