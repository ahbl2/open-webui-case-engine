<script lang="ts">
	/**
	 * P82-03 — Read-only overview metrics: seven KPI tiles (same translucent color system as home OCC `ds-occ-kpi-card`).
	 * Canonical color + icon per domain for the whole case workspace: docs/CASE_OVERVIEW_KPI_CANON.md
	 */
	import { onDestroy } from 'svelte';
	import { caseEngineToken } from '$lib/stores';
	import {
		listCaseTimelineEntriesPage,
		listCaseFilesPage,
		listCaseNotebookNotes,
		listProposalsPaginated,
		listCaseIntelligenceCommittedEntities,
		listWarrantDrafts
	} from '$lib/apis/caseEngine';
	import { listCaseWorkflowItems } from '$lib/apis/caseEngine/caseWorkflowItemsApi';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		DS_STACK_CLASSES,
		DS_STATUS_TEXT_CLASSES,
		DS_STATUS_SURFACE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { P128_OVERVIEW_PENDING_PROPOSALS_HINT } from '$lib/caseContext/p128ProposalFramingCopy';
	import {
		BookOpenIcon,
		CalendarDaysIcon,
		ClipboardDocumentListIcon,
		DocumentTextIcon,
		FolderIcon,
		ShieldCheckIcon,
		UserGroupIcon
	} from 'heroicons-svelte/24/outline';

	export let caseId: string;

	type Ready<T> = { state: 'loading' } | { state: 'ready'; value: T } | { state: 'error'; message: string };

	let loadGeneration = 0;
	let timeline: Ready<number> = { state: 'loading' };
	let notes: Ready<number> = { state: 'loading' };
	let files: Ready<number> = { state: 'loading' };
	let entities: Ready<number> = { state: 'loading' };
	let workflow: Ready<number> = { state: 'loading' };
	let proposals: Ready<number> = { state: 'loading' };
	let warrants: Ready<number> = { state: 'loading' };

	const tileBase = 'ds-occ-kpi-card ds-case-overview-kpi-tile h-full min-w-0';

	function resetMetrics(): void {
		timeline = { state: 'loading' };
		notes = { state: 'loading' };
		files = { state: 'loading' };
		entities = { state: 'loading' };
		workflow = { state: 'loading' };
		proposals = { state: 'loading' };
		warrants = { state: 'loading' };
	}

	async function loadMetrics(id: string, token: string, gen: number): Promise<void> {
		resetMetrics();
		const settled = await Promise.allSettled([
			listCaseTimelineEntriesPage(id, token, { limit: 1, offset: 0 }),
			listCaseNotebookNotes(id, token),
			listCaseFilesPage(id, token, { limit: 1, offset: 0 }),
			listCaseIntelligenceCommittedEntities(id, token),
			listCaseWorkflowItems(id, token),
			listProposalsPaginated(id, token, 'pending', { limit: 1, offset: 0 }),
			listWarrantDrafts(id, token)
		]);
		if (gen !== loadGeneration) return;

		const [tl, nb, fi, en, wf, pr, wa] = settled;

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

		if (nb.status === 'fulfilled') {
			const rows = nb.value.filter((n) => !n.deleted_at);
			notes = { state: 'ready', value: rows.length };
		} else {
			notes = {
				state: 'error',
				message: nb.reason instanceof Error ? nb.reason.message : 'Could not load notebook notes count.'
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

		if (en.status === 'fulfilled') {
			entities = { state: 'ready', value: en.value.committed_entities.length };
		} else {
			entities = {
				state: 'error',
				message: en.reason instanceof Error ? en.reason.message : 'Could not load entities count.'
			};
		}

		if (wf.status === 'fulfilled') {
			const rows = wf.value.filter((r) => !r.deleted_at);
			workflow = { state: 'ready', value: rows.length };
		} else {
			workflow = {
				state: 'error',
				message: wf.reason instanceof Error ? wf.reason.message : 'Could not load workflow items.'
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

		if (wa.status === 'fulfilled') {
			const n = wa.value.items?.length ?? 0;
			warrants =
				typeof n === 'number' && Number.isFinite(n)
					? { state: 'ready', value: n }
					: { state: 'error', message: 'Invalid warrant drafts count.' };
		} else {
			warrants = {
				state: 'error',
				message: wa.reason instanceof Error ? wa.reason.message : 'Could not load warrant drafts.'
			};
		}
	}

	$: token = $caseEngineToken;

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
	class={DS_STACK_CLASSES.stack}
	data-testid="case-overview-summary-cards"
	aria-label="Case overview metrics"
>
	<div
		class="w-full min-w-0 max-w-full border-b border-[color:var(--ds-border-default)] pb-4"
	>
		<div
			class="grid w-full grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 lg:gap-2"
			data-testid="case-overview-summary-cards-grid"
		>
			<!-- Timeline — blue (home OCC blue) -->
			<div class="{tileBase} ds-occ-kpi-card--blue">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Timeline entries</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<CalendarDaysIcon />
					</div>
				</div>
				{#if timeline.state === 'loading'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-center" role="status">
						<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">—</p>
						<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--loading">
							<span class="inline-flex items-center gap-2">
								<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
								Loading…
							</span>
						</p>
					</div>
				{:else if timeline.state === 'error'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-end">
						<div class="rounded-md px-2 py-1.5 text-xs {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
							<p class="ds-status-copy">{timeline.message}</p>
						</div>
					</div>
				{:else}
					<div class="ds-case-overview-kpi-tile__stack flex-1">
						<p class="ds-occ-kpi-card__metric" data-metric="timeline-total">{timeline.value}</p>
						<p class="ds-occ-kpi-card__support">Committed chronology</p>
					</div>
				{/if}
			</div>

			<!-- Notes — cyan (between timeline blue and files green) -->
			<div class="{tileBase} ds-occ-kpi-card--cyan">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Notebook notes</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<BookOpenIcon />
					</div>
				</div>
				{#if notes.state === 'loading'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-center" role="status">
						<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">—</p>
						<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--loading">
							<span class="inline-flex items-center gap-2">
								<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
								Loading…
							</span>
						</p>
					</div>
				{:else if notes.state === 'error'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-end">
						<div class="rounded-md px-2 py-1.5 text-xs {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
							<p class="ds-status-copy">{notes.message}</p>
						</div>
					</div>
				{:else}
					<div class="ds-case-overview-kpi-tile__stack flex-1">
						<p class="ds-occ-kpi-card__metric" data-metric="notes-total">{notes.value}</p>
						<p class="ds-occ-kpi-card__support">Working drafts</p>
					</div>
				{/if}
			</div>

			<!-- Files — green (home OCC green / teal family) -->
			<div class="{tileBase} ds-occ-kpi-card--green">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Files / evidence</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<FolderIcon />
					</div>
				</div>
				{#if files.state === 'loading'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-center" role="status">
						<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">—</p>
						<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--loading">
							<span class="inline-flex items-center gap-2">
								<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
								Loading…
							</span>
						</p>
					</div>
				{:else if files.state === 'error'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-end">
						<div class="rounded-md px-2 py-1.5 text-xs {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
							<p class="ds-status-copy">{files.message}</p>
						</div>
					</div>
				{:else}
					<div class="ds-case-overview-kpi-tile__stack flex-1">
						<p class="ds-occ-kpi-card__metric" data-metric="files-total">{files.value}</p>
						<p class="ds-occ-kpi-card__support">Uploads &amp; attachments</p>
					</div>
				{/if}
			</div>

			<!-- Entities — violet -->
			<div class="{tileBase} ds-occ-kpi-card--violet">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Entities</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<UserGroupIcon />
					</div>
				</div>
				{#if entities.state === 'loading'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-center" role="status">
						<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">—</p>
						<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--loading">
							<span class="inline-flex items-center gap-2">
								<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
								Loading…
							</span>
						</p>
					</div>
				{:else if entities.state === 'error'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-end">
						<div class="rounded-md px-2 py-1.5 text-xs {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
							<p class="ds-status-copy">{entities.message}</p>
						</div>
					</div>
				{:else}
					<div class="ds-case-overview-kpi-tile__stack flex-1">
						<p class="ds-occ-kpi-card__metric" data-metric="entities-total">{entities.value}</p>
						<p class="ds-occ-kpi-card__support">People, phones, vehicles…</p>
					</div>
				{/if}
			</div>

			<!-- Workflow — yellow -->
			<div class="{tileBase} ds-occ-kpi-card--yellow">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Workflow tasks</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<ClipboardDocumentListIcon />
					</div>
				</div>
				{#if workflow.state === 'loading'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-center" role="status">
						<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">—</p>
						<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--loading">
							<span class="inline-flex items-center gap-2">
								<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
								Loading…
							</span>
						</p>
					</div>
				{:else if workflow.state === 'error'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-end">
						<div class="rounded-md px-2 py-1.5 text-xs {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
							<p class="ds-status-copy">{workflow.message}</p>
						</div>
					</div>
				{:else}
					<div class="ds-case-overview-kpi-tile__stack flex-1">
						<p class="ds-occ-kpi-card__metric" data-metric="workflow-total">{workflow.value}</p>
						<p class="ds-occ-kpi-card__support">Case workflow items</p>
					</div>
				{/if}
			</div>

			<!-- Proposals — rose (distinct from workflow yellow + warrants orange) -->
			<div class="{tileBase} ds-occ-kpi-card--rose">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1" title={P128_OVERVIEW_PENDING_PROPOSALS_HINT}>Pending proposals</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<DocumentTextIcon />
					</div>
				</div>
				{#if proposals.state === 'loading'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-center" role="status">
						<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">—</p>
						<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--loading">
							<span class="inline-flex items-center gap-2">
								<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
								Loading…
							</span>
						</p>
					</div>
				{:else if proposals.state === 'error'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-end">
						<div class="rounded-md px-2 py-1.5 text-xs {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
							<p class="ds-status-copy">{proposals.message}</p>
						</div>
					</div>
				{:else}
					<div class="ds-case-overview-kpi-tile__stack flex-1">
						<p class="ds-occ-kpi-card__metric" data-metric="proposals-pending">{proposals.value}</p>
						<p class="ds-occ-kpi-card__support">Awaiting review</p>
					</div>
				{/if}
			</div>

			<!-- Warrants — orange (authority; distinct from workflow yellow + proposals rose) -->
			<div class="{tileBase} ds-occ-kpi-card--orange">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Warrants / drafts</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<ShieldCheckIcon />
					</div>
				</div>
				{#if warrants.state === 'loading'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-center" role="status">
						<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">—</p>
						<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--loading">
							<span class="inline-flex items-center gap-2">
								<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
								Loading…
							</span>
						</p>
					</div>
				{:else if warrants.state === 'error'}
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-end">
						<div class="rounded-md px-2 py-1.5 text-xs {DS_STATUS_SURFACE_CLASSES.error}" role="alert">
							<p class="ds-status-copy">{warrants.message}</p>
						</div>
					</div>
				{:else}
					<div class="ds-case-overview-kpi-tile__stack flex-1">
						<p class="ds-occ-kpi-card__metric" data-metric="warrants-total">{warrants.value}</p>
						<p class="ds-occ-kpi-card__support">Warrant draft records</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</section>
