<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { getCaseGraph } from '$lib/apis/caseEngine';
	import type {
		CaseGraphResponse,
		GraphNode,
		GraphEdge,
		GraphEvidenceItem
	} from '$lib/apis/caseEngine';
	import GraphCanvas from '$lib/components/case/graph/GraphCanvas.svelte';

	const EXCERPT_MAX = 200;

	export let caseId: string;
	export let token: string;
	export let isAdmin: boolean = false;

	let data: CaseGraphResponse | null = null;
	let loading = false;
	let error: string | null = null;
	let includeDeleted = false;
	let selectedNode: GraphNode | null = null;
	let selectedSourceId: string | null = null;

	$: if (caseId && token) {
		loadGraph();
	}

	async function loadGraph() {
		loading = true;
		error = null;
		selectedNode = null;
		selectedSourceId = null;
		try {
			data = await getCaseGraph(caseId, token, {
				includeDeleted: isAdmin ? includeDeleted : undefined
			});
		} catch (e) {
			error = (e as Error)?.message ?? 'Failed to load graph';
			toast.error(error);
			data = null;
		} finally {
			loading = false;
		}
	}

	function selectNode(node: GraphNode) {
		selectedNode = selectedNode?.id === node.id ? null : node;
		selectedSourceId = null;
	}

	function selectSource(evidenceItemId: string) {
		selectedSourceId = selectedSourceId === evidenceItemId ? null : evidenceItemId;
	}

	$: filteredEdges =
		data && selectedNode
			? data.graph.edges.filter(
					(e) => e.from === selectedNode!.id || e.to === selectedNode!.id
				)
			: data?.graph.edges ?? [];

	$: nodesByType =
		data?.graph.nodes.reduce(
			(acc, n) => {
				(acc[n.type] = acc[n.type] ?? []).push(n);
				return acc;
			},
			{} as Record<string, GraphNode[]>
		) ?? {};

	$: selectedEvidence =
		data && selectedSourceId
			? data.evidencePack.items.find((i) => i.id === selectedSourceId)
			: null;

	const TYPE_LABELS: Record<string, string> = {
		person: 'People',
		phone: 'Phones',
		location: 'Locations',
		event: 'Events'
	};
</script>

<div class="graph-panel flex flex-col h-full min-h-0">
	{#if loading}
		<div class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
			Loading graph…
		</div>
	{:else if error}
		<div class="flex-1 flex items-center justify-center text-red-600 dark:text-red-400 px-4">
			{error}
		</div>
	{:else if data}
		<div class="shrink-0 flex items-center gap-3 px-2 py-2 border-b border-gray-200 dark:border-gray-700">
			<span class="text-sm text-gray-600 dark:text-gray-400">
				{data.graph.stats.nodeCount} nodes · {data.graph.stats.edgeCount} edges ·
				{data.graph.stats.sourceCount} sources
			</span>
			{#if selectedNode}
				<button
					type="button"
					class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
					on:click={() => { selectedNode = null; selectedSourceId = null; }}
				>
					Clear selection
				</button>
			{/if}
			{#if isAdmin}
				<label class="flex items-center gap-1.5 text-sm">
					<input
						type="checkbox"
						bind:checked={includeDeleted}
						on:change={loadGraph}
					/>
					Include deleted
				</label>
			{/if}
		</div>

		<div class="flex-1 min-h-0 flex flex-col gap-2 p-2 overflow-auto">
			<!-- Visual graph canvas (Ticket 24) -->
			<div class="shrink-0">
				<GraphCanvas
					nodes={data.graph.nodes}
					edges={data.graph.edges}
					selectedNodeId={selectedNode?.id ?? null}
					width={600}
					height={280}
					on:nodeSelect={(e) => selectNode(e.detail)}
					on:clearSelection={() => { selectedNode = null; selectedSourceId = null; }}
				/>
			</div>

			<!-- Sidebar: nodes + edges + sources + excerpts -->
			<div class="flex-1 min-h-0 grid grid-cols-[1fr_1fr] gap-2 overflow-auto">
			<!-- Left: Nodes grouped by type -->
			<div class="flex flex-col gap-3 overflow-auto">
				{#each Object.entries(nodesByType) as [type, nodes]}
					<div>
						<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase mb-1">
							{TYPE_LABELS[type] ?? type}
						</h3>
						<ul class="space-y-0.5">
							{#each nodes as node}
								<li>
									<button
										type="button"
										class="w-full text-left px-2 py-1 rounded text-sm truncate
											{selectedNode?.id === node.id
											? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
											: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
										on:click={() => selectNode(node)}
									>
										{node.label}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>

			<!-- Right: Edges + Sources -->
			<div class="flex flex-col gap-2 overflow-auto">
				<div>
					<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase mb-1">
						Edges
						{#if selectedNode}
							<span class="normal-case font-normal">(filtered by {selectedNode.label})</span>
						{/if}
					</h3>
					{#if filteredEdges.length === 0}
						<p class="text-sm text-gray-500 dark:text-gray-400 italic">
							No edges{selectedNode ? ' for this node' : ''}.
						</p>
					{:else}
						<ul class="space-y-0.5">
							{#each filteredEdges as edge}
								{@const fromNode = data?.graph.nodes.find((n) => n.id === edge.from)}
								{@const toNode = data?.graph.nodes.find((n) => n.id === edge.to)}
								<li class="text-sm px-2 py-1 rounded bg-gray-50 dark:bg-gray-800/50">
									<span class="font-medium">{fromNode?.label ?? edge.from}</span>
									<span class="text-gray-500 mx-1">—{edge.type}—</span>
									<span class="font-medium">{toNode?.label ?? edge.to}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				{#if selectedNode}
					<div>
						<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase mb-1">
							Sources
						</h3>
						<ul class="space-y-0.5">
							{#each selectedNode.sources as src}
								{@const item = data?.evidencePack.items.find((i) => i.id === src.evidenceItemId)}
								<li>
									<button
										type="button"
										class="w-full text-left px-2 py-1 rounded text-sm
											{selectedSourceId === src.evidenceItemId
											? 'bg-blue-100 dark:bg-blue-900/40'
											: 'hover:bg-gray-100 dark:hover:bg-gray-800'}"
										on:click={() => selectSource(src.evidenceItemId)}
									>
										{src.evidenceItemId}
										{#if item}
											<span class="text-gray-500 ml-1">
												({item.kind === 'timeline_entry'
													? item.occurredAt ?? 'entry'
													: item.filename ?? 'file'})
											</span>
										{/if}
									</button>
								</li>
							{/each}
						</ul>
					</div>

					{#if selectedEvidence}
						<div class="flex-1 min-h-0 flex flex-col">
							<h3 class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase mb-1">
								Evidence excerpt
							</h3>
							<pre
								class="flex-1 min-h-[80px] p-2 text-xs bg-gray-50 dark:bg-gray-800 rounded overflow-auto whitespace-pre-wrap break-words"
							>
								{(selectedEvidence.text || '(no text)').slice(0, EXCERPT_MAX)}{selectedEvidence.text && selectedEvidence.text.length > EXCERPT_MAX ? '…' : ''}
							</pre>
						</div>
					{/if}
				{/if}
			</div>
			</div>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
			No data
		</div>
	{/if}
</div>
