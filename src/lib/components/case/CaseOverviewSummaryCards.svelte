<script lang="ts">
	/**
	 * P82-03 — Read-only overview metrics from existing Case Engine list endpoints + `activeCaseMeta`.
	 * No fabricated counts: each value comes from a successful API response or store-backed case fields.
	 */
	import { onDestroy } from 'svelte';
	import { caseEngineToken, activeCaseMeta } from '$lib/stores';
	import {
		listCaseTimelineEntriesPage,
		listCaseFilesPage,
		listCaseNotebookNotes,
		listProposalsPaginated,
		listCaseIntelligenceCommittedEntities
	} from '$lib/apis/caseEngine';
	import { caseStatusDsBadgeCompound } from '$lib/utils/caseIdentityStrip';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		DS_BADGE_CLASSES,
		DS_SUMMARY_CLASSES,
		DS_STACK_CLASSES,
		DS_TYPE_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_STATUS_SURFACE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let caseId: string;

	type Ready<T> = { state: 'loading' } | { state: 'ready'; value: T } | { state: 'error'; message: string };

	let loadGeneration = 0;
	let timeline: Ready<number> = { state: 'loading' };
	let files: Ready<number> = { state: 'loading' };
	let notes: Ready<number> = { state: 'loading' };
	let proposals: Ready<number> = { state: 'loading' };
	let entities: Ready<number> = { state: 'loading' };

	function resetMetrics(): void {
		timeline = { state: 'loading' };
		files = { state: 'loading' };
		notes = { state: 'loading' };
		proposals = { state: 'loading' };
		entities = { state: 'loading' };
	}

	async function loadMetrics(id: string, token: string, gen: number): Promise<void> {
		resetMetrics();
		const settled = await Promise.allSettled([
			listCaseTimelineEntriesPage(id, token, { limit: 1, offset: 0 }),
			listCaseFilesPage(id, token, { limit: 1, offset: 0 }),
			listCaseNotebookNotes(id, token),
			listProposalsPaginated(id, token, 'pending', { limit: 1, offset: 0 }),
			listCaseIntelligenceCommittedEntities(id, token)
		]);
		if (gen !== loadGeneration) return;

		const [tl, fi, nb, pr, en] = settled;

		if (tl.status === 'fulfilled') {
			const n = tl.value.total;
			timeline =
				typeof n === 'number' && Number.isFinite(n)
					? { state: 'ready', value: n }
					: { state: 'error', message: 'Invalid timeline total.' };
		} else {
			timeline = {
				state: 'error',
				message: tl.reason instanceof Error ? tl.reason.message : 'Could not load timeline count.'
			};
		}

		if (fi.status === 'fulfilled') {
			const n = fi.value.totalFiles;
			files =
				typeof n === 'number' && Number.isFinite(n)
					? { state: 'ready', value: n }
					: { state: 'error', message: 'Invalid files total.' };
		} else {
			files = {
				state: 'error',
				message: fi.reason instanceof Error ? fi.reason.message : 'Could not load files count.'
			};
		}

		if (nb.status === 'fulfilled') {
			notes = { state: 'ready', value: nb.value.length };
		} else {
			notes = {
				state: 'error',
				message: nb.reason instanceof Error ? nb.reason.message : 'Could not load notebook notes.'
			};
		}

		if (pr.status === 'fulfilled') {
			const n = pr.value.totalsByStatus.pending;
			proposals =
				typeof n === 'number' && Number.isFinite(n)
					? { state: 'ready', value: n }
					: { state: 'error', message: 'Invalid proposals total.' };
		} else {
			proposals = {
				state: 'error',
				message: pr.reason instanceof Error ? pr.reason.message : 'Could not load proposals count.'
			};
		}

		if (en.status === 'fulfilled') {
			entities = { state: 'ready', value: en.value.committed_entities.length };
		} else {
			entities = {
				state: 'error',
				message: en.reason instanceof Error ? en.reason.message : 'Could not load entities count.'
			};
		}
	}

	$: token = $caseEngineToken;
	$: meta = $activeCaseMeta;

	$: if (caseId && token) {
		loadGeneration += 1;
		const gen = loadGeneration;
		loadMetrics(caseId, token, gen);
	} else {
		loadGeneration += 1;
		resetMetrics();
	}

	onDestroy(() => {
		loadGeneration += 1;
	});
</script>

<section
	class="{DS_STACK_CLASSES.stack} border-b border-[color:var(--ds-border-default)] pb-6"
	data-testid="case-overview-summary-cards"
	aria-labelledby="case-overview-summary-cards-heading"
>
	<div class={DS_STACK_CLASSES.tight}>
		<h2 id="case-overview-summary-cards-heading" class={DS_TYPE_CLASSES.panel}>
			Case metrics
		</h2>
		<p class="{DS_TYPE_CLASSES.meta} max-w-3xl text-[var(--ds-text-secondary)]">
			Read-only counts from Case Engine. Notebook counts are your drafts only (owner-scoped).
		</p>
	</div>

	<div
		class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
		data-testid="case-overview-summary-cards-grid"
	>
		<!-- Case record (store / layout — same source as case header) -->
		<div class={DS_SUMMARY_CLASSES.outputCard}>
			<p class={DS_TYPE_CLASSES.label}>Case record</p>
			{#if !meta}
				<div class="mt-3 flex items-center gap-2 {DS_TYPE_CLASSES.meta}" role="status">
					<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
					<span>Loading case details…</span>
				</div>
			{:else}
				<dl class="mt-3 space-y-2.5">
					<div>
						<dt class={DS_TYPE_CLASSES.meta}>Case number</dt>
						<dd class="{DS_TYPE_CLASSES.mono} mt-0.5 tabular-nums">{meta.case_number}</dd>
					</div>
					<div>
						<dt class={DS_TYPE_CLASSES.meta}>Status</dt>
						<dd class="mt-0.5">
							{#if meta.status?.trim()}
								<span class={caseStatusDsBadgeCompound(meta.status)}>{meta.status}</span>
							{:else}
								<span class="{DS_BADGE_CLASSES.base} {DS_BADGE_CLASSES.neutral}">No status</span>
							{/if}
						</dd>
					</div>
					<div>
						<dt class={DS_TYPE_CLASSES.meta}>Unit</dt>
						<dd class="{DS_TYPE_CLASSES.body} mt-0.5">{meta.unit?.trim() ? meta.unit : '—'}</dd>
					</div>
					<div>
						<dt class={DS_TYPE_CLASSES.meta}>Incident date</dt>
						<dd class="{DS_TYPE_CLASSES.body} mt-0.5">
							{#if meta.incident_date?.trim()}
								{meta.incident_date}
							{:else}
								None recorded
							{/if}
						</dd>
					</div>
				</dl>
			{/if}
		</div>

		<!-- Timeline -->
		<div class={DS_SUMMARY_CLASSES.outputCard}>
			<p class={DS_TYPE_CLASSES.label}>Timeline entries</p>
			{#if timeline.state === 'loading'}
				<div class="mt-3 flex items-center gap-2" role="status">
					<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
					<span class={DS_TYPE_CLASSES.meta}>Loading…</span>
				</div>
			{:else if timeline.state === 'error'}
				<div class="mt-3 rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
					<p class="ds-status-copy">{timeline.message}</p>
				</div>
			{:else}
				<p class="{DS_TYPE_CLASSES.display} mt-2 tabular-nums" data-metric="timeline-total">{timeline.value}</p>
				<a
					href="/case/{caseId}/timeline"
					class="{DS_SUMMARY_CLASSES.navLink} mt-3 inline-block"
					data-testid="case-overview-summary-link-timeline"
					>View timeline</a
				>
			{/if}
		</div>

		<!-- Files -->
		<div class={DS_SUMMARY_CLASSES.outputCard}>
			<p class={DS_TYPE_CLASSES.label}>Files</p>
			{#if files.state === 'loading'}
				<div class="mt-3 flex items-center gap-2" role="status">
					<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
					<span class={DS_TYPE_CLASSES.meta}>Loading…</span>
				</div>
			{:else if files.state === 'error'}
				<div class="mt-3 rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
					<p class="ds-status-copy">{files.message}</p>
				</div>
			{:else}
				<p class="{DS_TYPE_CLASSES.display} mt-2 tabular-nums" data-metric="files-total">{files.value}</p>
				<a
					href="/case/{caseId}/files"
					class="{DS_SUMMARY_CLASSES.navLink} mt-3 inline-block"
					data-testid="case-overview-summary-link-files"
					>View files</a
				>
			{/if}
		</div>

		<!-- Notebook notes (owner-scoped API) -->
		<div class={DS_SUMMARY_CLASSES.outputCard}>
			<p class={DS_TYPE_CLASSES.label}>Your notebook notes</p>
			<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[var(--ds-text-secondary)]">
				Count for your drafts on this case (Case Engine notebook scope).
			</p>
			{#if notes.state === 'loading'}
				<div class="mt-3 flex items-center gap-2" role="status">
					<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
					<span class={DS_TYPE_CLASSES.meta}>Loading…</span>
				</div>
			{:else if notes.state === 'error'}
				<div class="mt-3 rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
					<p class="ds-status-copy">{notes.message}</p>
				</div>
			{:else}
				<p class="{DS_TYPE_CLASSES.display} mt-2 tabular-nums" data-metric="notes-total">{notes.value}</p>
				<a
					href="/case/{caseId}/notes"
					class="{DS_SUMMARY_CLASSES.navLink} mt-3 inline-block"
					data-testid="case-overview-summary-link-notes"
					>View notes</a
				>
			{/if}
		</div>

		<!-- Committed entities -->
		<div class={DS_SUMMARY_CLASSES.outputCard}>
			<p class={DS_TYPE_CLASSES.label}>Committed entities</p>
			<p class="{DS_TYPE_CLASSES.meta} mt-1 text-[var(--ds-text-secondary)]">
				Entities committed to this case (intelligence registry).
			</p>
			{#if entities.state === 'loading'}
				<div class="mt-3 flex items-center gap-2" role="status">
					<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
					<span class={DS_TYPE_CLASSES.meta}>Loading…</span>
				</div>
			{:else if entities.state === 'error'}
				<div class="mt-3 rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
					<p class="ds-status-copy">{entities.message}</p>
				</div>
			{:else}
				<p class="{DS_TYPE_CLASSES.display} mt-2 tabular-nums" data-metric="entities-total">{entities.value}</p>
				<a
					href="/case/{caseId}/entities"
					class="{DS_SUMMARY_CLASSES.navLink} mt-3 inline-block"
					data-testid="case-overview-summary-link-entities"
					>View entities</a
				>
			{/if}
		</div>

		<!-- Pending proposals -->
		<div class={DS_SUMMARY_CLASSES.outputCard}>
			<p class={DS_TYPE_CLASSES.label}>Pending proposals</p>
			{#if proposals.state === 'loading'}
				<div class="mt-3 flex items-center gap-2" role="status">
					<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
					<span class={DS_TYPE_CLASSES.meta}>Loading…</span>
				</div>
			{:else if proposals.state === 'error'}
				<div class="mt-3 rounded-md px-3 py-2 text-sm {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
					<p class="ds-status-copy">{proposals.message}</p>
				</div>
			{:else}
				<p class="{DS_TYPE_CLASSES.display} mt-2 tabular-nums" data-metric="proposals-pending">{proposals.value}</p>
				<a
					href="/case/{caseId}/proposals"
					class="{DS_SUMMARY_CLASSES.navLink} mt-3 inline-block"
					data-testid="case-overview-summary-link-proposals"
					>View proposals</a
				>
			{/if}
		</div>
	</div>
</section>
