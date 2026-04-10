<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		listWorkflowSupportLinks,
		createWorkflowSupportLink,
		deleteWorkflowSupportLink,
		listCaseTimelineEntries,
		listCaseFiles,
		listCaseNotebookNotes,
		CaseEngineRequestError,
		type WorkflowItem,
		type WorkflowSupportLink,
		type WorkflowSupportTargetKind
	} from '$lib/apis/caseEngine';
	import {
		hrefForSupportLinkTarget,
		isWorkflowSupportLinkStale,
		loadSupportLinkTargetIndex,
		primaryLabelForSupportLink,
		savedSupportLinkDisplay,
		secondaryIdLineForSupportLink,
		supportLinkKindBadgeClass,
		supportLinkKindShortLabel,
		type SupportLinkTargetIndex
	} from '$lib/utils/workflowSupportLinkDisplay';
	import {
		buildCaseFileSupportPickerRows,
		buildNotebookSupportPickerRows,
		buildTimelineSupportPickerRows,
		filterSupportLinkPickerRows,
		type SupportLinkPickerRow
	} from '$lib/utils/workflowSupportLinkPicker';

	export let caseId: string;
	export let token: string;
	export let item: WorkflowItem;
	export let embedded: boolean = false;

	const dispatch = createEventDispatcher<{ close: void; updated: void }>();

	/** Must match `MAX_ACTIVE_SUPPORT_LINKS_PER_WORKFLOW_ITEM` in Detective Case Engine `workflowSupportLinkService.ts`. */
	const MAX_ACTIVE_SUPPORT_LINKS_PER_WORKFLOW_ITEM = 100;

	const kindLabels: Record<WorkflowSupportTargetKind, string> = {
		TIMELINE_ENTRY: 'Timeline entry',
		NOTEBOOK_NOTE: 'Notebook note',
		CASE_FILE: 'Case file'
	};

	const kinds: WorkflowSupportTargetKind[] = ['TIMELINE_ENTRY', 'NOTEBOOK_NOTE', 'CASE_FILE'];

	const openSurfaceShort: Record<WorkflowSupportTargetKind, string> = {
		TIMELINE_ENTRY: 'Timeline',
		NOTEBOOK_NOTE: 'Notes',
		CASE_FILE: 'Files'
	};

	let links: WorkflowSupportLink[] = [];
	let loading = false;
	let loadError = '';
	let mutationBusy = false;
	let fetchSeq = 0;

	let addStep: 'idle' | 'pick_kind' | 'pick_target' = 'idle';
	let pickKind: WorkflowSupportTargetKind | null = null;
	let targetsLoadBusy = false;
	let pickerRows: SupportLinkPickerRow[] = [];
	let pickerSearchQuery = '';
	let pickerHoverId: string | null = null;
	let pickerFocusId: string | null = null;
	let pickerShellEl: HTMLDivElement | null = null;

	/** P60-13 — support link row id (`WorkflowSupportLink.id`), max one expanded at a time. */
	let expandedSavedSupportLinkRowId: string | null = null;

	function toggleSavedSupportLinkExpand(supportLinkRowId: string) {
		expandedSavedSupportLinkRowId =
			expandedSavedSupportLinkRowId === supportLinkRowId ? null : supportLinkRowId;
	}

	$: pickerFilteredRows = filterSupportLinkPickerRows(pickerRows, pickerSearchQuery);
	$: {
		const ids = new Set(pickerFilteredRows.map((r) => r.id));
		if (pickerHoverId && !ids.has(pickerHoverId)) pickerHoverId = null;
		if (pickerFocusId && !ids.has(pickerFocusId)) pickerFocusId = null;
	}
	$: pickerPreviewId = pickerHoverId ?? pickerFocusId;
	$: pickerPreviewRow =
		pickerPreviewId && pickerFilteredRows.length > 0
			? pickerFilteredRows.find((r) => r.id === pickerPreviewId) ?? null
			: null;

	/** Label maps for the active case (shared across items in the same case). */
	let targetIndex: SupportLinkTargetIndex | null = null;
	let targetIndexCaseId = '';

	async function ensureTargetIndex(): Promise<SupportLinkTargetIndex> {
		if (targetIndex && targetIndexCaseId === caseId) return targetIndex;
		const idx = await loadSupportLinkTargetIndex(caseId, token);
		targetIndex = idx;
		targetIndexCaseId = caseId;
		return idx;
	}

	let syncKey = '';
	$: atActiveLinkLimit = links.length >= MAX_ACTIVE_SUPPORT_LINKS_PER_WORKFLOW_ITEM;
	$: {
		const next = `${caseId}:${item.id}`;
		if (next !== syncKey) {
			syncKey = next;
			addStep = 'idle';
			pickKind = null;
			pickerRows = [];
			pickerSearchQuery = '';
			pickerHoverId = null;
			pickerFocusId = null;
			expandedSavedSupportLinkRowId = null;
			void loadLinks();
		}
	}

	async function loadLinks() {
		const seq = ++fetchSeq;
		loading = true;
		loadError = '';
		try {
			await ensureTargetIndex();
			if (seq !== fetchSeq) return;
			const list = await listWorkflowSupportLinks(caseId, item.id, token);
			if (seq !== fetchSeq) return;
			links = list;
			if (
				expandedSavedSupportLinkRowId &&
				!list.some((row) => row.id === expandedSavedSupportLinkRowId)
			) {
				expandedSavedSupportLinkRowId = null;
			}
		} catch (e) {
			if (seq !== fetchSeq) return;
			loadError = (e as Error)?.message ?? 'Failed to load support links';
			links = [];
		} finally {
			if (seq === fetchSeq) loading = false;
		}
	}

	function startAdd() {
		if (atActiveLinkLimit) {
			toast.error(
				`This workflow item already has the maximum number of support references (${MAX_ACTIVE_SUPPORT_LINKS_PER_WORKFLOW_ITEM}). Remove one before adding another.`
			);
			return;
		}
		addStep = 'pick_kind';
		pickKind = null;
		pickerRows = [];
		pickerSearchQuery = '';
		pickerHoverId = null;
		pickerFocusId = null;
		expandedSavedSupportLinkRowId = null;
	}

	function cancelAdd() {
		addStep = 'idle';
		pickKind = null;
		pickerRows = [];
		pickerSearchQuery = '';
		pickerHoverId = null;
		pickerFocusId = null;
		expandedSavedSupportLinkRowId = null;
	}

	async function selectKind(k: WorkflowSupportTargetKind) {
		pickKind = k;
		addStep = 'pick_target';
		targetsLoadBusy = true;
		pickerRows = [];
		pickerSearchQuery = '';
		pickerHoverId = null;
		pickerFocusId = null;
		const seq = fetchSeq;
		try {
			if (k === 'TIMELINE_ENTRY') {
				const entries = await listCaseTimelineEntries(caseId, token);
				if (seq !== fetchSeq) return;
				pickerRows = buildTimelineSupportPickerRows(entries.filter((e) => !e.deleted_at));
			} else if (k === 'CASE_FILE') {
				const files = await listCaseFiles(caseId, token);
				if (seq !== fetchSeq) return;
				pickerRows = buildCaseFileSupportPickerRows(
					files.filter((f) => !(f as { deleted_at?: string | null }).deleted_at)
				);
			} else {
				const notes = await listCaseNotebookNotes(caseId, token);
				if (seq !== fetchSeq) return;
				pickerRows = buildNotebookSupportPickerRows(notes.filter((n) => !n.deleted_at));
			}
		} catch (e) {
			if (seq !== fetchSeq) return;
			toast.error((e as Error)?.message ?? 'Failed to load targets');
			cancelAdd();
		} finally {
			if (seq === fetchSeq) targetsLoadBusy = false;
		}
	}

	async function submitLink(targetId: string) {
		const tid = targetId.trim();
		if (!pickKind || mutationBusy || !tid) return;
		mutationBusy = true;
		const seq = fetchSeq;
		try {
			await createWorkflowSupportLink(caseId, item.id, token, { target_kind: pickKind, target_id: tid });
			if (seq !== fetchSeq) return;
			toast.success('Supporting reference added (planning only — not an official record).');
			cancelAdd();
			await loadLinks();
			dispatch('updated');
		} catch (e) {
			if (seq !== fetchSeq) return;
			const err = e as CaseEngineRequestError;
			const msg = err?.message ?? 'Add failed';
			if (err.httpStatus === 409) toast.error(msg || 'Already linked to this target.');
			else if (err.httpStatus === 400)
				toast.error(msg || 'Invalid request — check target type and id.');
			else if (err.httpStatus === 404)
				toast.error(msg || 'Workflow item or target not found (or no longer active).');
			else toast.error(msg);
		} finally {
			if (seq === fetchSeq) mutationBusy = false;
		}
	}

	async function removeLink(link: WorkflowSupportLink) {
		if (mutationBusy) return;
		mutationBusy = true;
		const seq = fetchSeq;
		try {
			await deleteWorkflowSupportLink(caseId, item.id, link.id, token);
			if (seq !== fetchSeq) return;
			toast.success('Supporting reference removed.');
			await loadLinks();
			dispatch('updated');
		} catch (e) {
			if (seq !== fetchSeq) return;
			const err = e as CaseEngineRequestError;
			const msg = (err as Error)?.message ?? 'Remove failed';
			if (err.httpStatus === 404)
				toast.error(msg || 'That reference is already removed or not on this workflow item.');
			else toast.error(msg);
		} finally {
			if (seq === fetchSeq) mutationBusy = false;
		}
	}
</script>

<div
	data-testid="workflow-support-links-panel"
	class="min-w-0 rounded-md border border-gray-200 dark:border-gray-600 bg-white/90 dark:bg-gray-950/40 {embedded
		? 'p-2 space-y-2'
		: 'p-3 space-y-3'}"
>
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div class="min-w-0">
			<h4
				class="{embedded ? 'text-[11px]' : 'text-xs'} font-semibold text-gray-800 dark:text-gray-200"
			>
				Supporting references
			</h4>
			<p class="{embedded ? 'text-[10px]' : 'text-[11px]'} text-gray-600 dark:text-gray-400 max-w-prose">
				Links help trace this workflow item to Timeline entries, notes, or files. They are not the official
				record and do not create timeline or note commits.
			</p>
		</div>
		<button
			type="button"
			data-testid="workflow-support-links-close"
			class="shrink-0 rounded border border-gray-200 dark:border-gray-600 px-2 py-0.5 text-[11px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
			on:click={() => dispatch('close')}
		>
			Close
		</button>
	</div>

	{#if mutationBusy}
		<p
			data-testid="workflow-support-links-mutation-busy"
			class="text-[11px] text-amber-800 dark:text-amber-200/90"
			aria-live="polite"
		>
			Updating support links…
		</p>
	{/if}

	{#if loading}
		<p data-testid="workflow-support-links-loading" class="text-[11px] text-gray-500">Loading links…</p>
	{:else if loadError}
		<p data-testid="workflow-support-links-load-error" class="text-[11px] text-red-600 dark:text-red-400">
			{loadError}
		</p>
		<button
			type="button"
			class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
			on:click={() => loadLinks()}
		>
			Retry
		</button>
	{:else}
		<ul class="space-y-3 min-w-0" data-testid="workflow-support-links-list">
			{#each links as L (L.id)}
				<li
					class="flex flex-col gap-2 rounded-md border border-gray-100 dark:border-gray-800/90 bg-gray-50/40 dark:bg-gray-950/20 px-2.5 py-2"
					data-testid={`workflow-support-link-row-${L.id}`}
				>
					{#if targetIndex}
						{@const savedRefDisplay = savedSupportLinkDisplay(L, targetIndex)}
						<div class="flex flex-wrap items-start justify-between gap-2">
							<div class="min-w-0 flex-1 space-y-1.5">
								<div class="flex flex-wrap items-center gap-1.5">
									<span
										data-testid={`workflow-support-link-kind-${L.target_kind}`}
										class="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide {supportLinkKindBadgeClass[
											L.target_kind
										]}"
									>
										{supportLinkKindShortLabel[L.target_kind]}
									</span>
									{#if isWorkflowSupportLinkStale(L)}
										<span
											data-testid="workflow-support-link-stale"
											class="inline-flex items-center rounded border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/90 dark:bg-amber-950/40 px-1 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-100"
											title="Target was removed or is no longer visible in this case."
										>
											Stale
										</span>
									{/if}
								</div>
								{#if savedRefDisplay}
									<p
										class="{embedded ? 'text-[10px]' : 'text-[11px]'} text-gray-900 dark:text-gray-100 font-semibold break-words leading-snug tracking-tight"
										data-testid="workflow-support-link-primary-label"
									>
										{savedRefDisplay.primaryLine}
									</p>
									<p
										class="text-[10px] font-medium text-gray-500 dark:text-gray-400 break-words leading-snug"
										data-testid="workflow-support-link-secondary-meta"
									>
										{savedRefDisplay.secondaryLine}
									</p>
									{#if savedRefDisplay.teaser.trim()}
										<p
											class="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 border-l-2 border-gray-200 dark:border-gray-600 pl-2 ml-0.5"
											data-testid="workflow-support-link-teaser"
										>
											{savedRefDisplay.teaser}
										</p>
									{/if}
								{:else}
									<p
										class="{embedded ? 'text-[10px]' : 'text-[11px]'} text-gray-800 dark:text-gray-200 font-medium break-words leading-snug"
										data-testid="workflow-support-link-primary-label"
									>
										{primaryLabelForSupportLink(L, targetIndex)}
									</p>
									{#if secondaryIdLineForSupportLink(L, targetIndex)}
										<p
											class="font-mono text-[10px] text-gray-500 dark:text-gray-400 break-all"
											data-testid="workflow-support-link-secondary-id"
										>
											{secondaryIdLineForSupportLink(L, targetIndex)}
										</p>
									{/if}
								{/if}
								<div class="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
									<a
										data-testid="workflow-support-link-open-target"
										data-link-id-open={L.id}
										href={hrefForSupportLinkTarget(caseId, L.target_kind, L.target_id)}
										class="inline-flex text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
									>
										Open in {openSurfaceShort[L.target_kind]}
									</a>
									<button
										type="button"
										data-testid="workflow-support-link-expand-toggle"
										data-support-link-row-id={L.id}
										class="inline-flex text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:underline disabled:opacity-50"
										aria-expanded={expandedSavedSupportLinkRowId === L.id}
										aria-controls={`workflow-support-link-expanded-${L.id}`}
										id={`workflow-support-link-expand-btn-${L.id}`}
										disabled={mutationBusy}
										on:click={() => toggleSavedSupportLinkExpand(L.id)}
									>
										{expandedSavedSupportLinkRowId === L.id ? 'Hide details' : 'Details'}
									</button>
								</div>
							</div>
							<button
								type="button"
								data-testid="workflow-support-link-remove"
								data-link-id={L.id}
								class="shrink-0 text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 text-[11px]"
								disabled={mutationBusy}
								on:click={() => removeLink(L)}
							>
								Remove
							</button>
						</div>
						{#if expandedSavedSupportLinkRowId === L.id}
							<div
								id={`workflow-support-link-expanded-${L.id}`}
								role="region"
								aria-labelledby={`workflow-support-link-expand-btn-${L.id}`}
								data-testid="workflow-support-link-expanded-preview"
								class="rounded-md border border-gray-200/90 dark:border-gray-700/90 bg-white/60 dark:bg-gray-950/35 px-2.5 py-2"
							>
								{#if isWorkflowSupportLinkStale(L)}
									<p
										class="text-[10px] font-medium text-amber-900 dark:text-amber-100/95 mb-2 leading-snug"
										data-testid="workflow-support-link-expanded-stale-hint"
									>
										Stale reference — the target may no longer exist. Open the tab to confirm what is
										available.
									</p>
								{/if}
								{#if savedRefDisplay}
									<p class="text-[11px] font-semibold text-gray-900 dark:text-gray-100 leading-snug break-words">
										{savedRefDisplay.previewTitle}
									</p>
									<pre
										class="mt-1.5 mb-2 whitespace-pre-wrap font-sans text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed break-words border-b border-gray-100 dark:border-gray-800 pb-2"
										data-testid="workflow-support-link-expanded-meta"
									>{savedRefDisplay.previewMeta}</pre>
									<div class="max-h-44 overflow-y-auto pr-0.5">
										<p
											class="text-[11px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed break-words"
											data-testid="workflow-support-link-expanded-body"
										>
											{savedRefDisplay.previewBody}
										</p>
									</div>
								{:else}
									<p
										class="text-[11px] font-semibold text-gray-900 dark:text-gray-100 break-words"
										data-testid="workflow-support-link-expanded-fallback-primary"
									>
										{primaryLabelForSupportLink(L, targetIndex)}
									</p>
									{#if secondaryIdLineForSupportLink(L, targetIndex)}
										<p
											class="font-mono text-[10px] text-gray-500 dark:text-gray-400 break-all mt-1"
											data-testid="workflow-support-link-expanded-fallback-id"
										>
											{secondaryIdLineForSupportLink(L, targetIndex)}
										</p>
									{/if}
									<p class="text-[10px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
										No extended preview is available for this target. Use Open to view the full record.
									</p>
								{/if}
							</div>
						{/if}
					{:else}
						<div class="flex flex-wrap items-start justify-between gap-2">
							<div class="min-w-0 flex-1 space-y-1.5">
								<div class="flex flex-wrap items-center gap-1.5">
									<span
										data-testid={`workflow-support-link-kind-${L.target_kind}`}
										class="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide {supportLinkKindBadgeClass[
											L.target_kind
										]}"
									>
										{supportLinkKindShortLabel[L.target_kind]}
									</span>
								</div>
								<p class="text-[10px] text-gray-500">Resolving label…</p>
								<a
									data-testid="workflow-support-link-open-target"
									data-link-id-open={L.id}
									href={hrefForSupportLinkTarget(caseId, L.target_kind, L.target_id)}
									class="inline-flex text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
								>
									Open in {openSurfaceShort[L.target_kind]}
								</a>
							</div>
							<button
								type="button"
								data-testid="workflow-support-link-remove"
								data-link-id={L.id}
								class="shrink-0 text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 text-[11px]"
								disabled={mutationBusy}
								on:click={() => removeLink(L)}
							>
								Remove
							</button>
						</div>
					{/if}
				</li>
			{:else}
				<li class="text-[11px] text-gray-500" data-testid="workflow-support-links-empty-row">
					No supporting references yet.
				</li>
			{/each}
		</ul>
	{/if}

	<div class="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-2">
		{#if addStep === 'idle'}
			{#if atActiveLinkLimit}
				<p
					data-testid="workflow-support-links-at-limit"
					class="text-[11px] text-amber-800 dark:text-amber-200/90"
					role="status"
				>
					Maximum of {MAX_ACTIVE_SUPPORT_LINKS_PER_WORKFLOW_ITEM} support references per workflow item
					(server limit). Remove one to add another.
				</p>
			{/if}
			<button
				type="button"
				data-testid="workflow-support-links-add-open"
				class="rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-2 py-1 text-[11px] font-medium text-gray-800 dark:text-gray-200 disabled:opacity-50"
				disabled={mutationBusy || !!loadError || atActiveLinkLimit}
				on:click={startAdd}
			>
				Add supporting reference
			</button>
		{:else if addStep === 'pick_kind'}
			<p class="text-[11px] text-gray-600 dark:text-gray-400">Choose artifact type (same case only):</p>
			<div class="flex flex-wrap gap-1.5">
				{#each kinds as k}
					<button
						type="button"
						data-testid={`workflow-support-link-pick-kind-${k}`}
						class="rounded border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-[11px] text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
						on:click={() => selectKind(k)}
					>
						{kindLabels[k]}
					</button>
				{/each}
				<button
					type="button"
					class="text-[11px] text-gray-500 hover:underline"
					on:click={cancelAdd}
				>
					Cancel
				</button>
			</div>
		{:else if addStep === 'pick_target' && pickKind}
			<p class="text-[11px] font-medium text-gray-700 dark:text-gray-300">
				Select {kindLabels[pickKind]}
			</p>
			{#if targetsLoadBusy}
				<p class="text-[11px] text-gray-500">Loading…</p>
			{:else if pickerRows.length === 0}
				<p class="text-[11px] text-gray-500">No targets available for this type.</p>
			{:else}
				<input
					type="search"
					data-testid="workflow-support-link-picker-search"
					bind:value={pickerSearchQuery}
					placeholder="Filter list…"
					aria-label="Filter support link targets"
					autocomplete="off"
					class="w-full min-w-0 mb-2 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-950 px-2.5 py-1.5 text-[11px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-blue-500 dark:focus-visible:outline-blue-400"
				/>
				<div
					bind:this={pickerShellEl}
					data-testid="workflow-support-link-picker-shell"
					class="flex flex-col sm:flex-row gap-3 items-stretch min-w-0"
					on:mouseleave={() => {
						pickerHoverId = null;
					}}
					on:focusin={(e) => {
						const t = e.target as HTMLElement;
						if (typeof t?.matches === 'function' && t.matches('[data-picker-target-id]')) {
							pickerFocusId = t.getAttribute('data-picker-target-id');
						}
					}}
					on:focusout={(e) => {
						const r = e.relatedTarget as Node | null;
						if (!pickerShellEl?.contains(r)) pickerFocusId = null;
					}}
				>
					<div
						class="flex-1 min-w-0 min-h-[11rem] max-h-52 sm:max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/80 shadow-sm ring-1 ring-gray-200/60 dark:ring-gray-800/80 divide-y divide-gray-100 dark:divide-gray-800/90"
						data-testid="workflow-support-link-target-list"
					>
						{#if pickerFilteredRows.length === 0}
							<p
								class="px-3 py-4 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed"
								data-testid="workflow-support-link-picker-no-matches"
							>
								No matches for this filter.
							</p>
						{:else}
							{#each pickerFilteredRows as row (row.id)}
								<button
									type="button"
									data-testid="workflow-support-link-pick-target"
									data-target-id={row.id}
									data-picker-target-id={row.id}
									class="w-full text-left px-3 py-2.5 transition-colors duration-100 hover:bg-gray-100/90 dark:hover:bg-gray-800/90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500 dark:focus-visible:outline-blue-400 focus-visible:bg-blue-50/60 dark:focus-visible:bg-blue-950/35 {pickerPreviewId === row.id
										? 'bg-blue-50/80 dark:bg-blue-950/40 ring-1 ring-inset ring-blue-200/90 dark:ring-blue-800/80'
										: ''}"
									disabled={mutationBusy}
									aria-describedby="workflow-support-picker-preview"
									on:mouseenter={() => {
										pickerHoverId = row.id;
									}}
									on:click={() => submitLink(row.id)}
								>
									<span class="block font-semibold text-[11px] text-gray-900 dark:text-gray-100 leading-snug tracking-tight break-words"
										>{row.primaryLine}</span
									>
									<span class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1 leading-snug break-words"
										>{row.secondaryLine}</span
									>
									<span
										class="block text-[10px] text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed line-clamp-2 border-l-2 border-gray-200 dark:border-gray-600 pl-2 ml-0.5"
										>{row.teaser}</span
									>
								</button>
							{/each}
						{/if}
					</div>
					<div
						id="workflow-support-picker-preview"
						data-testid="workflow-support-picker-preview"
						role="region"
						aria-label="Selected target preview (read-only)"
						aria-live="polite"
						class="shrink-0 w-full sm:w-[min(18rem,40%)] sm:min-w-[15rem] sm:max-w-[20rem] max-h-52 sm:max-h-56 overflow-y-auto rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-gradient-to-b from-white to-gray-50/95 dark:from-gray-900 dark:to-gray-950 text-gray-800 dark:text-gray-200 shadow-md ring-1 ring-black/5 dark:ring-white/10"
					>
						{#if pickerPreviewRow}
							<div
								class="border-b-2 border-gray-200/90 dark:border-gray-700/90 bg-white/85 dark:bg-gray-950/55 sticky top-0 z-10 backdrop-blur-[2px]"
							>
								<p
									class="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 pt-2.5 pb-1"
								>
									Preview
								</p>
								<p class="font-semibold text-xs text-gray-900 dark:text-gray-100 leading-snug px-3 pb-2 break-words">
									{pickerPreviewRow.previewTitle}
								</p>
								<pre
									class="px-3 pb-2.5 whitespace-pre-wrap font-sans text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed break-words border-t border-gray-100 dark:border-gray-800/90 pt-2"
									data-testid="workflow-support-picker-preview-meta"
								>{pickerPreviewRow.previewMeta}</pre>
							</div>
							<div class="px-3 py-3 bg-white/40 dark:bg-gray-950/25">
								<p
									class="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5"
								>
									Excerpt
								</p>
								<p
									class="whitespace-pre-wrap font-sans text-[11px] leading-relaxed break-words text-gray-800 dark:text-gray-200"
									data-testid="workflow-support-picker-preview-body"
								>
									{pickerPreviewRow.previewBody}
								</p>
							</div>
						{:else}
							<p
								class="text-[11px] text-gray-500 dark:text-gray-400 p-3 leading-relaxed"
								data-testid="workflow-support-picker-preview-placeholder"
							>
								Hover a row or move focus with Tab to preview before you select.
							</p>
						{/if}
					</div>
				</div>
			{/if}
			<button type="button" class="text-[11px] text-gray-500 hover:underline mt-1" on:click={cancelAdd}>
				Cancel
			</button>
		{/if}
	</div>
</div>
