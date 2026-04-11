<script lang="ts">
	/**
	 * P69-07 — Connections summary (P69-02 §2, P69-04 R3). Read-only edge preview; links to associations intake.
	 */
	import { listCaseIntelligenceCommittedAssociations } from '$lib/apis/caseEngine';
	import type { CaseIntelligenceCommittedAssociationProjection } from '$lib/apis/caseEngine';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import { DS_ENTITY_BOARD_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;
	export let token: string;

	let loading = true;
	let error = '';
	let rows: CaseIntelligenceCommittedAssociationProjection[] = [];
	let loadGen = 0;
	let lastLoadKey = '';

	const previewCap = 6;

	async function load(): Promise<void> {
		if (!caseId || !token) return;
		loadGen += 1;
		const g = loadGen;
		loading = true;
		error = '';
		try {
			const res = await listCaseIntelligenceCommittedAssociations(caseId, token, {
				includeRetired: false
			});
			if (g !== loadGen) return;
			rows = res.committed_associations ?? [];
		} catch (e) {
			if (g !== loadGen) return;
			error = e instanceof Error ? e.message : 'Could not load associations summary.';
			rows = [];
		} finally {
			if (g === loadGen) loading = false;
		}
	}

	$: {
		const k = `${caseId}\0${token}`;
		if (caseId && token && k !== lastLoadKey) {
			lastLoadKey = k;
			void load();
		}
	}

	export function refreshConnections(): void {
		void load();
	}

	function kindLabel(k: string): string {
		return k.replace(/_/g, ' ').toLowerCase();
	}
</script>

<section
	class="{DS_ENTITY_BOARD_CLASSES.connectionsSection}"
	data-testid="entities-board-connections"
	aria-labelledby="entities-connections-heading"
>
	<div class="{DS_ENTITY_BOARD_CLASSES.connectionsHeader}">
		<h2 id="entities-connections-heading" class="ds-type-panel flex items-center gap-2.5">
			<span class="{DS_ENTITY_BOARD_CLASSES.connectionsDot}" aria-hidden="true"></span>
			Connections
		</h2>
		<button
			type="button"
			class="{DS_ENTITY_BOARD_CLASSES.connectionsRefresh}"
			data-testid="entities-connections-refresh"
			on:click={() => load()}
		>
			Refresh
		</button>
	</div>
	<p class="ds-type-meta mb-4 leading-relaxed">
		Committed association edges for this case (read-only summary). Full staging and commit workflows live in
		<strong class="text-[color:var(--ds-text-secondary)]">Stage 2</strong> below — orthogonal to P19 proposals.
	</p>

	<div class="min-h-[10.5rem] sm:min-h-[11rem] flex flex-col justify-center">
	{#if loading}
		<CaseLoadingState label="Loading connections…" testId="entities-connections-loading" />
	{:else if error}
		<CaseErrorState title="Connections unavailable" message={error} onRetry={() => load()} />
	{:else if rows.length === 0}
		<div class="{DS_ENTITY_BOARD_CLASSES.connectionsEmpty}" data-testid="entities-connections-empty">
			<p class="ds-type-body">No committed association edges yet.</p>
			<p class="ds-type-meta mt-1.5">Stage 2 below is where edges are drafted and promoted.</p>
		</div>
	{:else}
		<p class="text-xs text-slate-500 mb-2">
			<span class="font-medium text-slate-300">{rows.length}</span> committed edge{rows.length === 1 ? '' : 's'}
		</p>
		<ul class="space-y-2 max-h-48 overflow-y-auto" data-testid="entities-connections-list">
			{#each rows.slice(0, previewCap) as e (e.id)}
				<li
					class="{DS_ENTITY_BOARD_CLASSES.connectionsRow}"
					title="{e.endpoint_a_entity_id} ↔ {e.endpoint_b_entity_id}"
				>
					<span class="opacity-80">{kindLabel(e.association_kind)}</span>
					· {e.endpoint_a_entity_id.slice(0, 8)}… ↔ {e.endpoint_b_entity_id.slice(0, 8)}…
					· <span class="opacity-80">{e.assertion_lane}</span>
				</li>
			{/each}
		</ul>
		{#if rows.length > previewCap}
			<p class="text-[10px] text-slate-500 mt-2">Showing {previewCap} of {rows.length}. Open Stage 2 for the full list.</p>
		{/if}
	{/if}
	</div>
</section>
