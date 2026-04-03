<script lang="ts">
	/**
	 * Official Case Timeline
	 * P28-31 — Truth Visibility Pass
	 * P28-32 — Client-Side Type Filter
	 * P28-33 — Version History Indicator
	 * P28-34 — Timeline Entry Edit Surface (Governed)
	 * P28-35 — Soft-Delete + Restore UI
	 * P28-36 — Replace window.confirm with ConfirmDialog
	 * P28-37 — Timeline Entry Create UI (Governed)
	 * P28-38 — Timeline Usability Polish Pass
	 * P38-06 — beforeNavigate guard for unsaved create/edit (parity with Notes P28-29)
	 * P38-07 — operator microcopy: direct + Log entry vs Proposals review/commit (copy only)
	 * P38-08 — timeline type “note” vs Notes tab (labels/tooltips only; value stays `note`)
	 * P39-02 — deterministic search + occurred date range + type (client-side; P39-01 §6)
	 * P39-02A — invalid date hint, search match highlight, large-list hint
	 * P39-03 — bottom composer shell for create entry (separate date + time; P39-01 §3–§5)
	 *
	 * Displays the official case record from `timeline_entries` via
	 * GET /cases/:id/entries. This is distinct from notebook notes
	 * (working drafts). Entries can be created directly via the "Log entry"
	 * form (POST /cases/:id/entries) or through the proposal pipeline in Chat.
	 *
	 * Backend endpoint: GET /cases/:id/entries
	 * Table: timeline_entries
	 *
	 * P28-37 changes:
	 *   - "+ Log entry" button in header opens a governed inline create form
	 *   - Fields: occurred_at (datetime-local, UTC), type, text_original (required),
	 *     location_text (optional)
	 *   - On save: POST /cases/:id/entries; created entry inserted into list in
	 *     occurred_at order; form dismissed
	 *   - Dirty-switch guard: opening edit while create form has content (or vice versa)
	 *     triggers the shared ConfirmDialog before discarding
	 *   - No change_reason required for create (contrast with P28-34 edit)
	 */
	import { onMount } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { caseEngineToken, caseEngineUser } from '$lib/stores';
	import {
		listCaseTimelineEntries,
		createCaseTimelineEntry,
		updateCaseTimelineEntry,
		softDeleteTimelineEntry,
		restoreTimelineEntry,
		type TimelineEntry
	} from '$lib/apis/caseEngine';
	import CaseLoadingState from '$lib/components/case/CaseLoadingState.svelte';
	import CaseEmptyState from '$lib/components/case/CaseEmptyState.svelte';
	import CaseErrorState from '$lib/components/case/CaseErrorState.svelte';
	import TimelineEntryCard from '$lib/components/case/TimelineEntryCard.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import {
		isDirtyTimelineEdit,
		isoToDatetimeLocal,
		isDirtyBottomComposer,
		isBottomComposerSaveValid,
		type BottomComposerDraft
	} from './timelineUnsavedDirty';
	import {
		TIMELINE_EMPTY_STATE_DESCRIPTION,
		TIMELINE_HEADER_SUBLINE,
		TIMELINE_LOG_ENTRY_BUTTON_TITLE,
		TIMELINE_OFFICIAL_RECORD_BADGE_TITLE
	} from './timelineOperatorMicrocopy';
	import {
		TIMELINE_TYPE_NOTE_DISPLAY_LABEL,
		TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP
	} from '$lib/caseTimeline/timelineTypeNoteClarity';
	import {
		filterTimelineEntries,
		normalizeTimelineSearchNeedle
	} from '$lib/caseTimeline/timelineListFilter';
	import {
		isTimelineFilterDateRangeInverted,
		shouldShowLargeTimelineFilterHint
	} from '$lib/caseTimeline/timelineSearchUx';

	// ── Route-reuse case-switch guard (P28-46) ─────────────────────────────────
	// $: caseId (reactive) instead of const so it updates when SvelteKit reuses
	// this component for a different case. prevLoadedCaseId is seeded to the
	// initial param so the reactive reset block is a no-op on first render
	// (onMount handles initial load); it fires only on case switch.
	$: caseId = $page.params.id;
	let prevLoadedCaseId: string = $page.params.id ?? '';
	/** Incremented on each loadEntries() call; guards stale responses from writing to the new case. */
	let activeEntriesLoadId = 0;

	// ── Micro-interaction: auto-focus first field when a form opens (P28-38) ──
	function focusOnMount(node: HTMLElement): { destroy(): void } {
		node.focus();
		return { destroy() {} };
	}

	let entries: TimelineEntry[] = [];
	let loading = true;
	let loadError = '';
	let loadedAt = '';

	// ── Role + deleted-entry visibility (P28-35) ───────────────────────────────
	// isAdmin: true when the current Case Engine session is ADMIN.
	// showDeleted: ADMIN-only toggle — when true, fetches include soft-deleted entries.
	$: isAdmin = $caseEngineUser?.role === 'ADMIN';
	let showDeleted = false;

	// ── Case-switch reactive reset (P28-46) ────────────────────────────────────
	// Fires when caseId changes while the component remains mounted (route reuse).
	// Clears all case-bound state immediately, then loads the new case's entries.
	// All confirm dialogs are closed so old-case pending actions can't fire.
	$: if (caseId && $caseEngineToken && caseId !== prevLoadedCaseId) {
		prevLoadedCaseId = caseId;
		entries = [];
		loadError = '';
		loadedAt = '';
		activeFilter = 'all';
		filterSearchText = '';
		filterDateFrom = '';
		filterDateTo = '';
		showDeleted = false;
		showDeleteConfirm = false;
		pendingDeleteEntry = null;
		deleteLifecycleError = '';
		deleteInFlight = false;
		showRestoreConfirm = false;
		pendingRestoreEntry = null;
		restoreLifecycleError = '';
		restoreInFlight = false;
		composerOpen = false;
		composerDraft = null;
		composerSaving = false;
		composerError = '';
		editingEntryId = null;
		editDraft = null;
		editSaving = false;
		editError = '';
		showDiscardConfirm = false;
		pendingDiscardAction = null;
		loadEntries();
	}

	async function loadEntries(): Promise<void> {
		if (!$caseEngineToken) {
			loading = false;
			loadError = 'Case Engine session not active.';
			return;
		}
		activeEntriesLoadId += 1;
		const loadId = activeEntriesLoadId;
		loading = true;
		loadError = '';
		try {
			const result = await listCaseTimelineEntries(
				caseId,
				$caseEngineToken,
				isAdmin && showDeleted ? { includeDeleted: true } : undefined
			);
			if (loadId !== activeEntriesLoadId) return;
			entries = result;
			const now = new Date();
			loadedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
			activeFilter = 'all'; // reset filters on each reload so counts stay honest
			filterSearchText = '';
			filterDateFrom = '';
			filterDateTo = '';
		} catch (e: unknown) {
			if (loadId !== activeEntriesLoadId) return;
			loadError = e instanceof Error ? e.message : 'Failed to load timeline entries.';
		} finally {
			if (loadId === activeEntriesLoadId) loading = false;
		}
	}

	onMount(() => { loadEntries(); });

	// ── Client-side type filter (P28-32) ───────────────────────────────────────
	// Canonical entry types from timeline_entries.type (see TimelineEntryCard.svelte).
	// 'all' is a sentinel — never stored in the database.
	const FILTER_TYPES = [
		{ value: 'all',         label: 'All'          },
		{ value: 'note',        label: TIMELINE_TYPE_NOTE_DISPLAY_LABEL },
		{ value: 'surveillance',label: 'Surveillance' },
		{ value: 'interview',   label: 'Interview'    },
		{ value: 'evidence',    label: 'Evidence'     }
	] as const;
	type FilterValue = (typeof FILTER_TYPES)[number]['value'];

	let activeFilter: FilterValue = 'all';

	// P39-02 — search + occurred date range (client-side; no API change)
	let filterSearchText = '';
	let filterDateFrom = '';
	let filterDateTo = '';

	// ── Soft-delete / restore lifecycle (P28-35) ────────────────────────────────
	// All lifecycle actions use ConfirmDialog (non-blocking).
	// showDeleted re-fetches on toggle; deleteConfirm/restoreConfirm are independent dialogs.

	let showDeleteConfirm = false;
	let pendingDeleteEntry: TimelineEntry | null = null;
	let deleteLifecycleError = '';
	let deleteInFlight = false;

	let showRestoreConfirm = false;
	let pendingRestoreEntry: TimelineEntry | null = null;
	let restoreLifecycleError = '';
	let restoreInFlight = false;

	function handleDeleteEntry(entry: TimelineEntry): void {
		pendingDeleteEntry = entry;
		showDeleteConfirm = true;
		deleteLifecycleError = '';
	}

	async function executeDelete(): Promise<void> {
		if (!pendingDeleteEntry || !$caseEngineToken) return;
		deleteInFlight = true;
		deleteLifecycleError = '';
		const entryId = pendingDeleteEntry.id;
		pendingDeleteEntry = null;
		try {
			await softDeleteTimelineEntry(entryId, $caseEngineToken);
			if (showDeleted && isAdmin) {
				// ADMIN with showDeleted=true: mark entry as deleted in the local list
				// so it renders as the removed-state card without a full re-fetch.
				entries = entries.map((e) =>
					e.id === entryId
						? { ...e, deleted_at: new Date().toISOString() }
						: e
				);
			} else {
				// Normal view: remove the entry from the visible list.
				entries = entries.filter((e) => e.id !== entryId);
			}
			// If entry was being edited, cancel the draft.
			if (editingEntryId === entryId) cancelEdit();
		} catch (e: unknown) {
			deleteLifecycleError = e instanceof Error ? e.message : 'Remove failed. Please try again.';
		} finally {
			deleteInFlight = false;
		}
	}

	function handleRestoreEntry(entry: TimelineEntry): void {
		pendingRestoreEntry = entry;
		showRestoreConfirm = true;
		restoreLifecycleError = '';
	}

	async function executeRestore(): Promise<void> {
		if (!pendingRestoreEntry || !$caseEngineToken) return;
		restoreInFlight = true;
		restoreLifecycleError = '';
		const entry = pendingRestoreEntry;
		pendingRestoreEntry = null;
		try {
			await restoreTimelineEntry(caseId, entry.id, $caseEngineToken);
			// Mark entry as active in the local list (clear deleted_at).
			entries = entries.map((e) =>
				e.id === entry.id ? { ...e, deleted_at: null } : e
			);
		} catch (e: unknown) {
			restoreLifecycleError = e instanceof Error ? e.message : 'Restore failed. Please try again.';
		} finally {
			restoreInFlight = false;
		}
	}

	// ── P39-03 Bottom composer state ─────────────────────────────────────────────
	// Replaces the old inline create form (P28-37) with a bottom-sheet composer.
	// One composer at a time; mutually exclusive with the inline edit form.
	// Fields use separate date + time inputs per P39-01 §3 (no auto-fill; both required).

	let composerOpen = false;
	let composerDraft: BottomComposerDraft | null = null;
	let composerSaving = false;
	let composerError = '';

	$: composerSaveValid = isBottomComposerSaveValid(composerDraft);

	function doOpenComposer(): void {
		editingEntryId = null;
		editDraft = null;
		editError = '';
		composerDraft = {
			occurred_date: '',
			occurred_time: '',
			type: 'note',
			text_original: '',
			location_text: ''
		};
		composerError = '';
		composerOpen = true;
	}

	/** Called by the "Log entry" button. Guards against open edit draft. */
	function openCreateForm(): void {
		if (editingEntryId) {
			pendingDiscardAction = () => doOpenComposer();
			showDiscardConfirm = true;
			return;
		}
		doOpenComposer();
	}

	function cancelComposer(): void {
		composerOpen = false;
		composerDraft = null;
		composerError = '';
	}

	/** Requests cancel: shows confirm dialog if dirty, closes immediately if clean. */
	function requestCancelComposer(): void {
		if (!isDirtyBottomComposer(composerDraft)) {
			cancelComposer();
			return;
		}
		pendingDiscardAction = () => cancelComposer();
		showDiscardConfirm = true;
	}

	async function saveComposer(): Promise<void> {
		if (!composerDraft || !$caseEngineToken) return;
		if (!composerSaveValid) return;

		const text = composerDraft.text_original.trim();
		const localDatetime = `${composerDraft.occurred_date}T${composerDraft.occurred_time}`;

		composerSaving = true;
		composerError = '';
		try {
			const created = await createCaseTimelineEntry(caseId, $caseEngineToken, {
				occurred_at: datetimeLocalToIso(localDatetime),
				type: composerDraft.type,
				text_original: text,
				location_text: composerDraft.location_text.trim() || null
			});
			// Insert in occurred_at order; version_count defaults to 0 in card.
			entries = [...entries, created].sort(
				(a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
			);
			cancelComposer();
		} catch (e: unknown) {
			composerError = e instanceof Error ? e.message : 'Create failed. Please try again.';
		} finally {
			composerSaving = false;
		}
	}

	// ── Inline edit state (P28-34) ──────────────────────────────────────────────
	// Only one entry can be in edit mode at a time.
	// editDraft.occurred_at is stored in datetime-local format (YYYY-MM-DDTHH:mm:ss)
	// and converted to ISO 8601 UTC on save via datetimeLocalToIso().
	interface EditDraft {
		text_original: string;
		type: string;
		occurred_at: string;   // datetime-local format for <input type="datetime-local">
		location_text: string; // empty string means null on save
		change_reason: string;
	}

	const ENTRY_TYPES = ['note', 'surveillance', 'interview', 'evidence'] as const;

	function timelineEntryTypeOptionLabel(t: (typeof ENTRY_TYPES)[number]): string {
		return t === 'note'
			? TIMELINE_TYPE_NOTE_DISPLAY_LABEL
			: `${t.charAt(0).toUpperCase()}${t.slice(1)}`;
	}

	/** P39-02 — type chip labels must match searchable display strings */
	function timelineFilterTypeLabel(type: string): string {
		if ((ENTRY_TYPES as readonly string[]).includes(type)) {
			return timelineEntryTypeOptionLabel(type as (typeof ENTRY_TYPES)[number]);
		}
		return type ? `${type.charAt(0).toUpperCase()}${type.slice(1)}` : '';
	}

	function clearTimelineFilters(): void {
		filterSearchText = '';
		filterDateFrom = '';
		filterDateTo = '';
		activeFilter = 'all';
	}

	$: filteredEntries = filterTimelineEntries(
		entries,
		{
			searchText: filterSearchText,
			dateFrom: filterDateFrom,
			dateTo: filterDateTo,
			typeFilter: activeFilter
		},
		timelineFilterTypeLabel
	);

	$: filtersActive =
		normalizeTimelineSearchNeedle(filterSearchText) !== '' ||
		filterDateFrom !== '' ||
		filterDateTo !== '' ||
		activeFilter !== 'all';

	$: filterDateRangeInvalid = isTimelineFilterDateRangeInverted(filterDateFrom, filterDateTo);
	$: showLargeTimelineFilterHint = shouldShowLargeTimelineFilterHint(entries.length);
	$: searchHighlightNeedle = normalizeTimelineSearchNeedle(filterSearchText);

	// Count: "12 entries" unfiltered; "3 of 12 entries" when any filter active (P39-02)
	$: countLabel = (() => {
		const total = entries.length;
		const shown = filteredEntries.length;
		if (total === 0) return '';
		const unit = (n: number) => (n === 1 ? 'entry' : 'entries');
		if (!filtersActive) return `${total} ${unit(total)}`;
		return `${shown} of ${total} ${unit(total)}`;
	})();

	let editingEntryId: string | null = null;
	let editDraft: EditDraft | null = null;
	let editSaving = false;
	let editError = '';

	// ── Dirty-switch confirm dialog (P28-36) ────────────────────────────────────
	// Replaces window.confirm from P28-34. Same deferred-action pattern as Notes.
	let showDiscardConfirm = false;
	let pendingDiscardAction: (() => void) | null = null;

	/**
	 * Convert a datetime-local string back to an ISO 8601 UTC string.
	 * Appends 'Z' (UTC). Limitation: if the original was non-UTC, the
	 * timezone offset is lost — the backend stores the corrected value as-is.
	 */
	function datetimeLocalToIso(local: string): string {
		if (!local) return '';
		const clean = local.trim();
		if (clean.length === 16) return `${clean}:00Z`;
		if (clean.length === 19) return `${clean}Z`;
		return clean;
	}

	function doStartEdit(entry: TimelineEntry): void {
		// Close composer silently (guard already fired before calling this).
		composerOpen = false;
		composerDraft = null;
		composerError = '';
		editingEntryId = entry.id;
		editDraft = {
			text_original: entry.text_original,
			type: entry.type,
			occurred_at: isoToDatetimeLocal(entry.occurred_at),
			location_text: entry.location_text ?? '',
			change_reason: ''
		};
		editError = '';
	}

	function startEdit(entry: TimelineEntry): void {
		// Guard: another entry in edit mode, or composer has unsaved content.
		if ((editingEntryId && editingEntryId !== entry.id) || isDirtyBottomComposer(composerDraft)) {
			pendingDiscardAction = () => doStartEdit(entry);
			showDiscardConfirm = true;
			return;
		}
		doStartEdit(entry);
	}

	function cancelEdit(): void {
		editingEntryId = null;
		editDraft = null;
		editError = '';
	}

	async function saveEdit(): Promise<void> {
		if (!editingEntryId || !editDraft || !$caseEngineToken) return;

		const reason = editDraft.change_reason.trim();
		if (!reason) {
			editError = 'Reason for change is required.';
			return;
		}
		const text = editDraft.text_original.trim();
		if (!text) {
			editError = 'Entry text must not be empty.';
			return;
		}

		editSaving = true;
		editError = '';

		try {
			const updated = await updateCaseTimelineEntry(
				caseId,
				editingEntryId,
				$caseEngineToken,
				{
					text_original: text,
					type: editDraft.type,
					occurred_at: datetimeLocalToIso(editDraft.occurred_at),
					location_text: editDraft.location_text.trim() || null,
					change_reason: reason
				}
			);

			// Apply the returned values to the local entries array.
			// version_count is a computed column not in the PUT response,
			// so we increment it locally (+1 for the version just captured).
			const savedId = editingEntryId;
			entries = entries.map((e) => {
				if (e.id !== savedId) return e;
				return {
					...e,
					text_original: (updated.text_original as string) ?? e.text_original,
					type: (updated.type as string) ?? e.type,
					occurred_at: (updated.occurred_at as string) ?? e.occurred_at,
					location_text: (updated.location_text as string | null) ?? null,
					text_cleaned: (updated.text_cleaned as string | null) ?? null,
					version_count: (e.version_count ?? 0) + 1
				};
			});

			cancelEdit();
		} catch (e: unknown) {
			editError = e instanceof Error ? e.message : 'Save failed. Please try again.';
		} finally {
			editSaving = false;
		}
	}

	function isTimelineRouteDirty(): boolean {
		return (
			isDirtyBottomComposer(composerDraft) ||
			isDirtyTimelineEdit(editingEntryId, editDraft, entries)
		);
	}

	// ── Route-navigation guard (P38-06; pattern from Notes P28-29 / P28-46) ─────
	// Cross-case navigations pass through — the case-switch reactive block clears
	// timeline draft state. Loop prevention: discard clears dirty state before goto().
	beforeNavigate(({ cancel, willUnload, to }) => {
		if (!isTimelineRouteDirty() || willUnload || !to) return;
		if (to.params?.id && to.params.id !== caseId) return;
		if (showDiscardConfirm) {
			cancel();
			return;
		}
		cancel();
		const targetHref = to.url.href;
		pendingDiscardAction = () => {
			cancelComposer();
			cancelEdit();
			goto(targetHref);
		};
		showDiscardConfirm = true;
	});
</script>

<!--
	Official Case Timeline — P28-31 through P28-38
	Backed by timeline_entries (official case records).
	Not to be confused with notebook notes (working drafts).
	Renders inside the P19-06 case shell (+layout.svelte).
-->

<!-- Dirty-switch confirm dialog (P28-36) -->
<ConfirmDialog
	bind:show={showDiscardConfirm}
	title="Discard unsaved changes?"
	message="You have unsaved timeline changes. If you continue, they will be lost."
	cancelLabel="Keep editing"
	confirmLabel="Discard"
	onConfirm={() => {
		if (pendingDiscardAction) {
			pendingDiscardAction();
			pendingDiscardAction = null;
		}
	}}
/>

<!-- Soft-delete confirm dialog (P28-35) -->
<ConfirmDialog
	bind:show={showDeleteConfirm}
	title="Remove entry from timeline?"
	message="This entry will be soft-deleted and removed from the active timeline. It is not permanently deleted — an ADMIN can restore it. This action is audited."
	cancelLabel="Keep entry"
	confirmLabel="Remove"
	onConfirm={executeDelete}
/>

<!-- Restore confirm dialog (P28-35, ADMIN only) -->
<ConfirmDialog
	bind:show={showRestoreConfirm}
	title="Restore entry to timeline?"
	message="This entry will be restored to the active timeline and become visible to all users with access to this case."
	cancelLabel="Cancel"
	confirmLabel="Restore"
	onConfirm={executeRestore}
/>

<div class="flex flex-col flex-1 min-h-0 relative overflow-hidden" data-testid="case-timeline-page">

	<!-- ── Section header ──────────────────────────────────────────────────── -->
	<div class="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
		<div class="flex items-center gap-2 min-w-0 flex-wrap">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Case Timeline</h2>
			<span
				class="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded
				       bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
				title={TIMELINE_OFFICIAL_RECORD_BADGE_TITLE}
			>Official record</span>
			<!-- Count: updates with active filter -->
			{#if !loading && entries.length > 0}
				<span class="shrink-0 text-xs text-gray-400 dark:text-gray-500" data-testid="case-timeline-count">
					{countLabel}
				</span>
			{/if}
			<span class="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
				{TIMELINE_HEADER_SUBLINE}
			</span>
		</div>

		<!-- Refresh controls + ADMIN lifecycle toggle + Log entry (P28-31, P28-35, P28-37) -->
		<div class="flex items-center gap-2 shrink-0 flex-wrap">
			<!-- Log entry: opens the governed inline create form (P28-37) -->
			<button
				type="button"
				on:click={openCreateForm}
				disabled={loading}
				class="text-xs font-medium px-2.5 py-1 rounded
				       text-blue-600 dark:text-blue-400
				       hover:text-blue-800 dark:hover:text-blue-200
				       hover:bg-blue-50 dark:hover:bg-blue-900/20
				       disabled:opacity-40 transition"
				data-testid="case-timeline-log-entry"
				title={TIMELINE_LOG_ENTRY_BUTTON_TITLE}
			>
				+ Log entry
			</button>

			<!-- ADMIN-only: toggle to include soft-deleted entries in the fetch -->
			{#if isAdmin}
				<label
					class="flex items-center gap-1.5 cursor-pointer select-none"
					title="Show entries that have been soft-deleted (ADMIN only)"
				>
					<input
						type="checkbox"
						bind:checked={showDeleted}
						on:change={loadEntries}
						class="rounded border-gray-300 dark:border-gray-600 text-amber-600 focus:ring-amber-500 size-3"
						data-testid="case-timeline-show-deleted-toggle"
					/>
					<span class="text-[10px] text-gray-500 dark:text-gray-400">
						Show removed
					</span>
				</label>
			{/if}

			{#if loadedAt && !loading}
				<span
					class="text-[10px] text-gray-400 dark:text-gray-500 font-mono"
					title="Timeline data last loaded at this time"
				>
					{loadedAt}
				</span>
			{/if}
			<button
				type="button"
				disabled={loading}
				class="text-xs text-gray-500 dark:text-gray-400
				       hover:text-gray-700 dark:hover:text-gray-200
				       disabled:opacity-40 transition px-2 py-1 rounded
				       hover:bg-gray-100 dark:hover:bg-gray-800"
				on:click={loadEntries}
				title="Refresh timeline"
				aria-label="Refresh timeline"
				data-testid="case-timeline-refresh"
			>
				{loading ? '…' : '↻ Refresh'}
			</button>
		</div>
	</div>

	<!-- Lifecycle error banners (P28-35) — shown beneath header if a delete/restore fails -->
	{#if deleteLifecycleError}
		<div
			class="shrink-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800
			       text-xs text-red-600 dark:text-red-400 flex items-center gap-2"
			data-testid="timeline-delete-error"
		>
			<span>Remove failed: {deleteLifecycleError}</span>
			<button
				type="button"
				class="ml-auto text-xs text-red-400 hover:text-red-600"
				on:click={() => (deleteLifecycleError = '')}
				aria-label="Dismiss error"
			>✕</button>
		</div>
	{/if}
	{#if restoreLifecycleError}
		<div
			class="shrink-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800
			       text-xs text-red-600 dark:text-red-400 flex items-center gap-2"
			data-testid="timeline-restore-error"
		>
			<span>Restore failed: {restoreLifecycleError}</span>
			<button
				type="button"
				class="ml-auto text-xs text-red-400 hover:text-red-600"
				on:click={() => (restoreLifecycleError = '')}
				aria-label="Dismiss error"
			>✕</button>
		</div>
	{/if}

	<!-- ── Search + date range + type (P28-32 type chips; P39-02 text + dates) ── -->
	{#if !loading && !loadError && entries.length > 0}
		<div
			class="shrink-0 flex flex-col gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800"
			data-testid="case-timeline-search-filter-bar"
		>
			{#if showLargeTimelineFilterHint}
				<p
					class="text-[10px] text-gray-400 dark:text-gray-500 m-0"
					data-testid="case-timeline-filter-large-list-hint"
					role="status"
				>
					Filtering large timelines may be slower
				</p>
			{/if}
			<div class="flex flex-wrap items-center gap-2">
				<input
					type="search"
					bind:value={filterSearchText}
					placeholder="Search text, location, type…"
					class="text-xs rounded border border-gray-300 dark:border-gray-600
					       bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100
					       px-2 py-1.5 min-w-[10rem] flex-1 max-w-md
					       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
					data-testid="case-timeline-filter-search"
					aria-label="Search timeline entries"
				/>
				<div class="flex flex-col gap-0.5 min-w-0">
					<div class="flex items-center gap-1 flex-wrap">
						<label class="sr-only" for="timeline-filter-date-from">Occurred from</label>
						<input
							id="timeline-filter-date-from"
							type="date"
							bind:value={filterDateFrom}
							class="text-xs rounded border border-gray-300 dark:border-gray-600
							       bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 px-2 py-1.5
							       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
							data-testid="case-timeline-filter-date-from"
						/>
						<span class="text-[10px] text-gray-400 dark:text-gray-500">–</span>
						<label class="sr-only" for="timeline-filter-date-to">Occurred to</label>
						<input
							id="timeline-filter-date-to"
							type="date"
							bind:value={filterDateTo}
							class="text-xs rounded border border-gray-300 dark:border-gray-600
							       bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 px-2 py-1.5
							       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
							data-testid="case-timeline-filter-date-to"
						/>
					</div>
					{#if filterDateRangeInvalid}
						<span
							class="text-[10px] text-amber-600 dark:text-amber-400"
							data-testid="case-timeline-filter-date-range-hint"
							role="status"
						>
							Start date is after end date
						</span>
					{/if}
				</div>
				<button
					type="button"
					disabled={!filtersActive}
					class="text-xs font-medium px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600
					       text-gray-600 dark:text-gray-300
					       hover:bg-gray-100 dark:hover:bg-gray-800
					       disabled:opacity-40 disabled:cursor-not-allowed transition"
					data-testid="case-timeline-filter-clear"
					on:click={clearTimelineFilters}
				>
					Clear filters
				</button>
				{#if filtersActive}
					<span
						class="text-xs text-gray-500 dark:text-gray-400 tabular-nums"
						data-testid="case-timeline-filter-shown-count"
					>
						{filteredEntries.length} of {entries.length} match
					</span>
				{/if}
			</div>
			<div
				class="flex flex-wrap items-center gap-1"
				role="toolbar"
				aria-label="Filter timeline by entry type"
				data-testid="case-timeline-filter-strip"
			>
				{#each FILTER_TYPES as ft}
					<button
						type="button"
						class="text-xs px-2.5 py-1 rounded-full transition font-medium
						       {activeFilter === ft.value
						           ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
						           : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'}"
						on:click={() => (activeFilter = ft.value)}
						aria-pressed={activeFilter === ft.value}
						data-testid="case-timeline-filter-{ft.value}"
					>
						{ft.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Timeline list ───────────────────────────────────────────────────── -->
	<div class="flex-1 px-4 pt-4 min-h-0 overflow-y-auto flex flex-col gap-4 {composerOpen ? 'pb-80' : 'pb-6'}">

		<!-- Loading / error / list states -->
		<div class="flex-1 min-h-0 flex flex-col">
		{#if loading}
			<CaseLoadingState label="Loading timeline…" testId="case-timeline-loading" />

		{:else if loadError}
			<CaseErrorState
				title="Failed to load timeline"
				message={loadError}
				onRetry={loadEntries}
			/>

		{:else if entries.length === 0}
			<!-- Case has no entries yet -->
			<CaseEmptyState
				title="No official timeline entries recorded for this case."
				description={TIMELINE_EMPTY_STATE_DESCRIPTION}
				testId="case-timeline-empty"
			>
				<svelte:fragment slot="icon">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
						stroke-width="1.5" stroke="currentColor"
						class="size-7 text-gray-300 dark:text-gray-600">
						<path stroke-linecap="round" stroke-linejoin="round"
							d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
					</svg>
				</svelte:fragment>
			</CaseEmptyState>

		{:else if filteredEntries.length === 0}
			<!-- P39-02: entries exist but none match current filters (type + text + dates) -->
			<p
				class="text-sm text-gray-400 dark:text-gray-500 text-center py-12"
				data-testid="case-timeline-filter-empty"
			>
				No timeline entries match the current filters.
			</p>

		{:else}
			<!-- Chronological list — occurred_at ASC (earliest at top) -->
			<ol class="flex flex-col gap-3" aria-label="Official case timeline">
				{#each filteredEntries as entry (entry.id)}
					{#if editingEntryId === entry.id && editDraft}
						<!-- ── Inline governed edit form (P28-34) ──────────────────── -->
						<li
							class="flex flex-col gap-3 rounded-lg border-2 border-amber-300 dark:border-amber-700
							       bg-white dark:bg-gray-900 px-4 py-3 shadow-sm"
							data-testid="timeline-entry-edit-form"
							data-entry-id={entry.id}
						>
							<!-- Form header -->
							<div class="flex items-center justify-between gap-2 flex-wrap">
								<div class="flex items-center gap-2">
									<span class="text-xs font-semibold text-amber-700 dark:text-amber-400">
										Editing entry
									</span>
									<span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
										{entry.id.slice(0, 8)}…
									</span>
								</div>
								<span class="text-[10px] text-gray-400 dark:text-gray-500">
									Prior state will be captured automatically
								</span>
							</div>

						<!-- Entry text (full-width textarea) -->
						<div class="flex flex-col gap-1.5">
							<label
								class="text-xs font-medium text-gray-600 dark:text-gray-300"
								for="edit-text-{entry.id}"
							>
								Entry text
							</label>
							<textarea
								id="edit-text-{entry.id}"
								use:focusOnMount
								bind:value={editDraft.text_original}
								rows="5"
								class="text-sm rounded border border-gray-300 dark:border-gray-600
								       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
								       px-2.5 py-2 resize-y w-full
								       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
								data-testid="edit-text-input"
							></textarea>
						</div>

						<!-- Type + occurred_at side by side -->
						<div class="flex gap-3 flex-wrap">
							<!-- Type selector -->
							<div class="flex flex-col gap-1.5 flex-1 min-w-[140px]">
								<label
									class="text-xs font-medium text-gray-600 dark:text-gray-300"
									for="edit-type-{entry.id}"
								>
									Type
								</label>
								<select
									id="edit-type-{entry.id}"
									bind:value={editDraft.type}
									class="text-sm rounded border border-gray-300 dark:border-gray-600
									       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
									       px-2 py-1.5
									       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
									data-testid="edit-type-select"
									title={TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP}
								>
									{#each ENTRY_TYPES as t}
										<option value={t}>{timelineEntryTypeOptionLabel(t)}</option>
									{/each}
								</select>
							</div>

							<!-- occurred_at (datetime-local, treated as UTC) -->
							<div class="flex flex-col gap-1.5 flex-1 min-w-[200px]">
								<label
									class="text-xs font-medium text-gray-600 dark:text-gray-300"
									for="edit-occurred-{entry.id}"
								>
									Occurred at
									<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">
										(UTC)
									</span>
								</label>
								<input
									type="datetime-local"
									id="edit-occurred-{entry.id}"
									step="1"
									bind:value={editDraft.occurred_at}
									class="text-sm rounded border border-gray-300 dark:border-gray-600
									       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
									       px-2 py-1.5
									       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
									data-testid="edit-occurred-input"
								/>
							</div>
						</div>

						<!-- Location (optional) -->
						<div class="flex flex-col gap-1.5">
							<label
								class="text-xs font-medium text-gray-600 dark:text-gray-300"
								for="edit-location-{entry.id}"
							>
								Location
								<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">
									(optional)
								</span>
							</label>
							<input
								type="text"
								id="edit-location-{entry.id}"
								bind:value={editDraft.location_text}
								placeholder="Leave blank to clear"
								class="text-sm rounded border border-gray-300 dark:border-gray-600
								       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
								       px-2.5 py-1.5 w-full
								       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
								data-testid="edit-location-input"
							/>
						</div>

						<!-- Reason for change (required) -->
						<div class="flex flex-col gap-1.5">
							<label
								class="text-xs font-medium text-gray-700 dark:text-gray-200"
								for="edit-reason-{entry.id}"
							>
								Reason for change
								<span
									class="text-amber-600 dark:text-amber-400 ml-0.5"
									title="Required"
								>*</span>
							</label>
							<input
								type="text"
								id="edit-reason-{entry.id}"
								bind:value={editDraft.change_reason}
								placeholder="Why is this entry being corrected?"
								class="text-sm rounded border border-gray-300 dark:border-gray-600
								       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
								       px-2.5 py-1.5 w-full
								       focus:outline-none focus:ring-1 focus:ring-amber-400 dark:focus:ring-amber-600"
								data-testid="edit-reason-input"
							/>
						</div>

						<!-- Error -->
						{#if editError}
							<p
								class="text-xs text-red-500 dark:text-red-400"
								data-testid="timeline-edit-error"
							>
								{editError}
							</p>
						{/if}

						<!-- Actions -->
						<div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
								<button
									type="button"
									on:click={saveEdit}
									disabled={editSaving}
									class="text-xs font-medium px-3 py-1.5 rounded
									       bg-amber-600 hover:bg-amber-700 text-white
									       disabled:opacity-40 transition"
									data-testid="timeline-edit-save"
								>
									{editSaving ? 'Saving…' : 'Save changes'}
								</button>
								<button
									type="button"
									on:click={cancelEdit}
									disabled={editSaving}
									class="text-xs text-gray-500 dark:text-gray-400
									       hover:text-gray-700 dark:hover:text-gray-200
									       px-2 py-1.5 transition disabled:opacity-40"
									data-testid="timeline-edit-cancel"
								>
									Cancel
								</button>
								<span class="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
									Version history preserved automatically
								</span>
							</div>
						</li>
					{:else}
					<TimelineEntryCard
						{entry}
						{caseId}
						token={$caseEngineToken ?? ''}
						searchHighlightNeedle={searchHighlightNeedle}
						onEditRequest={() => startEdit(entry)}
						onDeleteRequest={() => handleDeleteEntry(entry)}
						onRestoreRequest={isAdmin ? () => handleRestoreEntry(entry) : null}
					/>
					{/if}
				{/each}
			</ol>
		{/if}
		</div><!-- end flex-1 loading/error/list wrapper -->
	</div>

	<!-- ── P39-03: Bottom composer sheet ──────────────────────────────────── -->
	<!--    Fixed to bottom of the page container; Timeline list stays visible.  -->
	<!--    One composer at a time; create only; no assist features in this PR.  -->
	{#if composerOpen && composerDraft}
		<!-- Gradient bleed above sheet — subtle visual separation (no blocking backdrop) -->
		<div
			class="absolute inset-x-0 pointer-events-none"
			style="bottom: 0; height: min(60vh, 20rem); background: linear-gradient(to top, rgba(0,0,0,0.06) 0%, transparent 100%);"
			aria-hidden="true"
		></div>

		<section
			class="absolute inset-x-0 bottom-0 z-20 flex flex-col
			       bg-white dark:bg-gray-900
			       border-t-2 border-blue-300 dark:border-blue-700
			       shadow-[0_-6px_24px_rgba(0,0,0,0.10)]
			       max-h-[60vh] overflow-y-auto"
			aria-label="Log new timeline entry"
			data-testid="timeline-bottom-composer"
		>
			<!-- Sheet header -->
			<div
				class="shrink-0 flex items-center gap-3 px-4 py-2.5
				       border-b border-gray-200 dark:border-gray-800 sticky top-0
				       bg-white dark:bg-gray-900 z-10"
			>
				<span class="text-xs font-semibold text-blue-700 dark:text-blue-400">
					New timeline entry
				</span>
				<span class="text-[10px] text-gray-400 dark:text-gray-500">
					Logged directly to the official case record
				</span>
				<button
					type="button"
					class="ml-auto rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
					       hover:bg-gray-100 dark:hover:bg-gray-800 transition"
					on:click={requestCancelComposer}
					aria-label="Close composer"
					data-testid="timeline-composer-close"
					title="Close without saving"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>

			<!-- Sheet body -->
			<div class="flex flex-col gap-3 px-4 py-3">
				<!-- Required: occurred date + time (split per P39-01 §3) -->
				<div class="flex gap-3 flex-wrap">
					<div class="flex flex-col gap-1">
						<label
							class="text-xs font-medium text-gray-600 dark:text-gray-300"
							for="composer-occurred-date"
						>
							Date
							<span class="text-blue-600 dark:text-blue-400 ml-0.5" title="Required — date when this occurred">*</span>
						</label>
						<input
							type="date"
							id="composer-occurred-date"
							bind:value={composerDraft.occurred_date}
							class="text-sm rounded border border-gray-300 dark:border-gray-600
							       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
							       px-2 py-1.5
							       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
							data-testid="composer-occurred-date"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label
							class="text-xs font-medium text-gray-600 dark:text-gray-300"
							for="composer-occurred-time"
						>
							Time
							<span class="text-blue-600 dark:text-blue-400 ml-0.5" title="Required — time when this occurred (UTC)">*</span>
							<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">(UTC)</span>
						</label>
						<input
							type="time"
							id="composer-occurred-time"
							step="60"
							bind:value={composerDraft.occurred_time}
							class="text-sm rounded border border-gray-300 dark:border-gray-600
							       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
							       px-2 py-1.5
							       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
							data-testid="composer-occurred-time"
						/>
					</div>
					<div class="flex flex-col gap-1 flex-1 min-w-[140px]">
						<label
							class="text-xs font-medium text-gray-600 dark:text-gray-300"
							for="composer-type"
						>
							Type
						</label>
						<select
							id="composer-type"
							bind:value={composerDraft.type}
							class="text-sm rounded border border-gray-300 dark:border-gray-600
							       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
							       px-2 py-1.5
							       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
							data-testid="composer-type-select"
							title={TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP}
						>
							{#each ENTRY_TYPES as t}
								<option value={t}>{timelineEntryTypeOptionLabel(t)}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Required: entry text -->
				<div class="flex flex-col gap-1">
					<label
						class="text-xs font-medium text-gray-600 dark:text-gray-300"
						for="composer-text"
					>
						Entry text
						<span class="text-blue-600 dark:text-blue-400 ml-0.5" title="Required">*</span>
					</label>
					<textarea
						id="composer-text"
						use:focusOnMount
						bind:value={composerDraft.text_original}
						rows="4"
						placeholder="Describe what was observed, recorded, or actioned…"
						class="text-sm rounded border border-gray-300 dark:border-gray-600
						       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
						       px-2.5 py-2 resize-y w-full
						       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
						data-testid="composer-text-input"
					></textarea>
				</div>

				<!-- Optional: location -->
				<div class="flex flex-col gap-1">
					<label
						class="text-xs font-medium text-gray-600 dark:text-gray-300"
						for="composer-location"
					>
						Location
						<span class="text-[10px] font-normal text-gray-400 dark:text-gray-500 ml-1">(optional)</span>
					</label>
					<input
						type="text"
						id="composer-location"
						bind:value={composerDraft.location_text}
						placeholder="e.g. 14 Elm Street, Victoria"
						class="text-sm rounded border border-gray-300 dark:border-gray-600
						       bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100
						       px-2.5 py-1.5 w-full
						       focus:outline-none focus:ring-1 focus:ring-blue-400 dark:focus:ring-blue-600"
						data-testid="composer-location-input"
					/>
				</div>

				<!-- Error -->
				{#if composerError}
					<p
						class="text-xs text-red-500 dark:text-red-400"
						data-testid="timeline-composer-error"
					>
						{composerError}
					</p>
				{/if}

				<!-- Actions -->
				<div
					class="flex items-center gap-2 pt-2.5 border-t border-gray-100 dark:border-gray-800"
				>
					<button
						type="button"
						on:click={saveComposer}
						disabled={composerSaving || !composerSaveValid}
						class="text-xs font-medium px-3 py-1.5 rounded
						       bg-blue-600 hover:bg-blue-700 text-white
						       disabled:opacity-40 disabled:cursor-not-allowed transition"
						title={!composerSaveValid ? 'Date, time, and entry text are required before saving' : 'Log this entry to the official case record'}
						data-testid="timeline-composer-save"
					>
						{composerSaving ? 'Saving…' : 'Log entry'}
					</button>
					<button
						type="button"
						on:click={requestCancelComposer}
						disabled={composerSaving}
						class="text-xs text-gray-500 dark:text-gray-400
						       hover:text-gray-700 dark:hover:text-gray-200
						       px-2 py-1.5 transition disabled:opacity-40"
						data-testid="timeline-composer-cancel"
					>
						Cancel
					</button>
					{#if !composerSaveValid}
						<span class="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
							Date, time, and text required
						</span>
					{:else}
						<span class="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
							Entry is logged directly to the case record
						</span>
					{/if}
				</div>
			</div>
		</section>
	{/if}
</div>
