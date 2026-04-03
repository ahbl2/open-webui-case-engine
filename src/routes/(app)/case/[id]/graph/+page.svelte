<script lang="ts">
	import { page } from '$app/stores';
	import { getCaseGraph } from '$lib/apis/caseEngine';
	import type {
		CaseGraphResponse,
		GraphNode,
		GraphEdge,
		GraphEvidenceItem,
		GraphSourceRef
	} from '$lib/apis/caseEngine';
	import { caseEngineToken } from '$lib/stores';
	import GraphCanvas from '$lib/components/case/graph/GraphCanvas.svelte';
	import { buildEntityFocusHref } from '$lib/utils/entityFocus';

	$: caseId = $page.params.id;

	let loading = false;
	let error = '';
	let data: CaseGraphResponse | null = null;

	let selectedNode: GraphNode | null = null;
	let selectedEdge: GraphEdge | null = null;

	// In-flight guard: prevents a slow stale response from overwriting fresh data
	// or dismissing the loading spinner for a concurrent newer load (P28-44).
	let activeGraphLoadId = 0;

	const TYPE_LABELS: Record<string, string> = {
		person: 'Person',
		phone: 'Phone',
		location: 'Location',
		event: 'Event'
	};

	const EDGE_LABELS: Record<string, string> = {
		mentions: 'Mentions',
		associated_with: 'Associated with',
		located_at: 'Located at',
		called: 'Called',
		messaged: 'Messaged',
		possessed: 'Possessed'
	};

	$: nodeTypeLegend = data
		? Array.from(new Set(data.graph.nodes.map((node) => node.type)))
		: [];
	$: edgeTypeLegend = data
		? Array.from(new Set(data.graph.edges.map((edge) => edge.type)))
		: [];

	$: selectedNodeEvidence = selectedNode ? evidenceForSources(selectedNode.sources) : [];
	$: selectedEdgeEvidence = selectedEdge ? evidenceForSources(selectedEdge.sources) : [];
	$: selectedEdgeFrom = selectedEdge
		? data?.graph.nodes.find((node) => node.id === selectedEdge.from) ?? null
		: null;
	$: selectedEdgeTo = selectedEdge
		? data?.graph.nodes.find((node) => node.id === selectedEdge.to) ?? null
		: null;

	$: if (caseId && $caseEngineToken) {
		void loadGraph();
	}

	async function loadGraph(): Promise<void> {
		activeGraphLoadId += 1;
		const loadId = activeGraphLoadId;
		loading = true;
		error = '';
		selectedNode = null;
		selectedEdge = null;
		try {
			const result = await getCaseGraph(caseId, $caseEngineToken!);
			if (loadId !== activeGraphLoadId) return;
			data = result;
		} catch (err) {
			if (loadId !== activeGraphLoadId) return;
			error = err instanceof Error ? err.message : 'Graph data could not be loaded.';
			data = null;
		} finally {
			if (loadId === activeGraphLoadId) loading = false;
		}
	}

	function selectNode(node: GraphNode): void {
		selectedNode = selectedNode?.id === node.id ? null : node;
		selectedEdge = null;
	}

	function selectEdge(edge: GraphEdge): void {
		selectedEdge = selectedEdge?.id === edge.id ? null : edge;
		selectedNode = null;
	}

	function clearSelection(): void {
		selectedNode = null;
		selectedEdge = null;
	}

	function edgeLabel(type: string): string {
		return EDGE_LABELS[type] ?? type;
	}

	function nodeTypeLabel(type: string): string {
		return TYPE_LABELS[type] ?? 'Entity';
	}

	function evidenceForSources(sources: GraphSourceRef[]): GraphEvidenceItem[] {
		if (!data || !Array.isArray(sources) || sources.length === 0) return [];
		const wanted = new Set(sources.map((src) => src.evidenceItemId));
		return data.evidencePack.items.filter((item) => wanted.has(item.id));
	}

	function formatEvidenceMeta(item: GraphEvidenceItem): string {
		if (item.kind === 'timeline_entry') {
			return item.occurredAt ? `Timeline entry (${item.occurredAt})` : 'Timeline entry';
		}
		return item.filename ? `File: ${item.filename}` : 'Case file';
	}

	function selectedNodeEntityHref(node: GraphNode): string | null {
		return buildEntityFocusHref({
			caseId,
			type: node.type,
			normalizedValue: node.normalized || ''
		});
	}
</script>

<div class="flex-1 min-h-0 overflow-auto p-4 md:p-6">
	<div class="mx-auto max-w-6xl space-y-4">
		<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
			<h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Graph</h1>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Read-only relationship visualization from backend graph output only. Edges are rendered only when explicitly returned by the Case Engine graph API.
			</p>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Supporting evidence appears in the detail panel when available.
			</p>
		</div>

		{#if !$caseEngineToken}
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<p class="text-sm text-gray-600 dark:text-gray-300">
					Case Engine authentication is required to load graph data.
				</p>
			</div>
		{:else if loading}
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<p class="text-sm text-gray-500 dark:text-gray-400">Loading graph data...</p>
			</div>
		{:else if error}
			<div class="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4">
				<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
			</div>
		{:else if !data}
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<p class="text-sm text-gray-600 dark:text-gray-300">No graph data available for this case.</p>
			</div>
		{:else}
			<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
				<div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<span>{data.graph.stats.nodeCount} node(s)</span>
					<span>•</span>
					<span>{data.graph.stats.edgeCount} edge(s)</span>
					<span>•</span>
					<span>{data.graph.stats.sourceCount} evidence source(s)</span>
				</div>

				<div class="mt-3">
					<GraphCanvas
						nodes={data.graph.nodes}
						edges={data.graph.edges}
						selectedNodeId={selectedNode?.id ?? null}
						selectedEdgeId={selectedEdge?.id ?? null}
						width={900}
						height={420}
						on:nodeSelect={(event) => selectNode(event.detail)}
						on:edgeSelect={(event) => selectEdge(event.detail)}
						on:clearSelection={clearSelection}
					/>
				</div>

				{#if data.graph.stats.nodeCount === 0}
					<p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
						No graph data available for this case.
					</p>
				{:else if data.graph.stats.edgeCount === 0}
					<p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
						No relationships returned by backend.
					</p>
				{/if}
			</div>

			<div class="grid gap-4 lg:grid-cols-3">
				<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-2">
					<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Legend</h2>
					<div>
						<p class="text-xs font-medium text-gray-700 dark:text-gray-300">Node types</p>
						{#if nodeTypeLegend.length === 0}
							<p class="text-xs text-gray-500 dark:text-gray-400">No node types returned.</p>
						{:else}
							<ul class="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-400">
								{#each nodeTypeLegend as type}
									<li>• {nodeTypeLabel(type)}</li>
								{/each}
							</ul>
						{/if}
					</div>
					<div>
						<p class="text-xs font-medium text-gray-700 dark:text-gray-300">Edge types</p>
						{#if edgeTypeLegend.length === 0}
							<p class="text-xs text-gray-500 dark:text-gray-400">No edge types returned.</p>
						{:else}
							<ul class="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-400">
								{#each edgeTypeLegend as type}
									<li>• {edgeLabel(type)}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>

				<div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 lg:col-span-2 space-y-2">
					<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Details</h2>
					{#if selectedNode}
						<div class="text-xs space-y-2">
							<p class="text-gray-700 dark:text-gray-300">
								<span class="font-medium">Node:</span> {selectedNode.label}
							</p>
							<p class="text-gray-600 dark:text-gray-400">
								Type: {nodeTypeLabel(selectedNode.type)} ({selectedNode.type})
							</p>
							<p class="text-gray-600 dark:text-gray-400">
								Normalized value: {selectedNode.normalized || 'Not provided'}
							</p>
							<p class="text-gray-600 dark:text-gray-400">
								Source refs: {selectedNode.sources.length}
							</p>
							{#if selectedNodeEntityHref(selectedNode)}
								<p>
									<a
										class="text-blue-700 dark:text-blue-400 hover:underline"
										href={selectedNodeEntityHref(selectedNode) ?? '#'}
									>
										Open Entity Focus
									</a>
								</p>
							{/if}
							<div>
								<p class="font-medium text-gray-700 dark:text-gray-300">Supporting evidence</p>
								{#if selectedNodeEvidence.length === 0}
									<p class="text-gray-500 dark:text-gray-400">No evidence excerpts available for this node.</p>
								{:else}
									<ul class="mt-1 space-y-2">
										{#each selectedNodeEvidence as item}
											<li class="rounded border border-gray-200 dark:border-gray-800 p-2">
												<p class="text-gray-700 dark:text-gray-300">{formatEvidenceMeta(item)} — {item.id}</p>
												<p class="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{item.text || '(no text excerpt returned)'}</p>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</div>
					{:else if selectedEdge}
						<div class="text-xs space-y-2">
							<p class="text-gray-700 dark:text-gray-300">
								<span class="font-medium">Edge:</span> {edgeLabel(selectedEdge.type)} ({selectedEdge.type})
							</p>
							<p class="text-gray-600 dark:text-gray-400">
								From: {selectedEdgeFrom?.label ?? selectedEdge.from}
							</p>
							<p class="text-gray-600 dark:text-gray-400">
								To: {selectedEdgeTo?.label ?? selectedEdge.to}
							</p>
							<p class="text-gray-600 dark:text-gray-400">
								Source refs: {selectedEdge.sources.length}
							</p>
							<div>
								<p class="font-medium text-gray-700 dark:text-gray-300">Supporting evidence</p>
								{#if selectedEdgeEvidence.length === 0}
									<p class="text-gray-500 dark:text-gray-400">No evidence excerpts available for this edge.</p>
								{:else}
									<ul class="mt-1 space-y-2">
										{#each selectedEdgeEvidence as item}
											<li class="rounded border border-gray-200 dark:border-gray-800 p-2">
												<p class="text-gray-700 dark:text-gray-300">{formatEvidenceMeta(item)} — {item.id}</p>
												<p class="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{item.text || '(no text excerpt returned)'}</p>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</div>
					{:else}
						<p class="text-sm text-gray-500 dark:text-gray-400">Select a node or edge to inspect details.</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
