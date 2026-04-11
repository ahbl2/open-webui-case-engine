<script lang="ts">
	/**
	 * TimelineEntryCard — P28-31 Truth Visibility Pass, P28-33 Version History Indicator,
	 *                     P28-34 Edit Surface, P28-35 Soft-Delete + Restore UI,
	 *                     P28-38 Usability Polish Pass
	 *                     P38-08 — type “note” vs Notes tab (labels/tooltips only)
	 *                     P39-02A — optional search match highlight (normalized needle from parent)
	 *                     Long body text: line-clamp (~4 lines) + per-entry Show more / Show less
	 *
	 * Truth signals (P28-31):
	 *   1. AI-assisted transparency — badge + show/hide original toggle
	 *   2. Edited badge — derived from version_count (0 = untouched)
	 *   3. occurred_at with seconds — prevents same-minute sequence ambiguity
	 *   4. Retrospective signal — when entry was logged >24h after it occurred
	 *   5. Attribution contrast — slightly more visible (text-gray-500)
	 *   6. Location: removed emoji 📍, replaced with plain "at:"
	 *
	 * Version history (P28-33):
	 *   - `Edited · vN` badge is a button that expands/collapses inline version history
	 *   - Lazy-loaded on first expand; cached for session
	 *
	 * Lifecycle (P28-35):
	 *   - Active entries: primary Edit inline; secondary actions in Notes-style ⋮ menu
	 *   - Deleted entries (entry.deleted_at set) render a compact removed-state view
	 *   - onRestoreRequest (ADMIN only) shown for deleted entries
	 */
	import { tick, afterUpdate } from 'svelte';
	import { DropdownMenu } from 'bits-ui';
	import { flyAndScale } from '$lib/utils/transitions';
	import type { TimelineEntry, TimelineEntryVersion } from '$lib/apis/caseEngine';
	import { listTimelineEntryVersions } from '$lib/apis/caseEngine';
	import {
		TIMELINE_TYPE_NOTE_DISPLAY_LABEL,
		TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP
	} from '$lib/caseTimeline/timelineTypeNoteClarity';
	import { splitTextForSearchHighlight } from '$lib/caseTimeline/timelineSearchUx';
	import {
		formatOperationalCaseDateTimeWithSeconds,
		formatCaseDateTime
	} from '$lib/utils/formatDateTime';
	import TimelineEntryLinkedImagesViewer from './TimelineEntryLinkedImagesViewer.svelte';
	import TimelineEntryProvenanceBlock from './TimelineEntryProvenanceBlock.svelte';
	import EllipsisVertical from '$lib/components/icons/EllipsisVertical.svelte';
	import ClockRotateRight from '$lib/components/icons/ClockRotateRight.svelte';
	import Download from '$lib/components/icons/Download.svelte';
	import GarbageBin from '$lib/components/icons/GarbageBin.svelte';
	import { downloadTimelineEntryExport } from '$lib/caseTimeline/timelineEntryExport';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_CARD_CLASSES,
		DS_CHIP_CLASSES,
		DS_TIMELINE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	export let entry: TimelineEntry;
	/** Case ID — required for the versions endpoint. */
	export let caseId: string;
	/** Case Engine JWT — required for the versions endpoint. */
	export let token: string;
	/** P28-34: Called when detective clicks Edit on an active entry. */
	export let onEditRequest: () => void = () => {};
	/** P28-35: Called when detective clicks Remove on an active entry. */
	export let onDeleteRequest: () => void = () => {};
	/**
	 * P28-35: Called when detective clicks Restore on a soft-deleted entry.
	 * Pass null to hide the Restore button (non-ADMIN users, or not applicable).
	 */
	export let onRestoreRequest: (() => void) | null = null;
	/** P39-02A: trim+lowercase needle from `normalizeTimelineSearchNeedle`; empty = no highlight */
	export let searchHighlightNeedle = '';

	const TYPE_LABELS: Record<string, string> = {
		note:         TIMELINE_TYPE_NOTE_DISPLAY_LABEL,
		surveillance: 'Surveillance',
		interview:    'Interview',
		evidence:     'Evidence'
	};

	function typeLabel(type: string): string {
		return TYPE_LABELS[type] ?? type;
	}

	function timelineTypeBadgeClass(type: string): string {
		switch (type) {
			case 'note':
				return DS_BADGE_CLASSES.neutral;
			case 'surveillance':
				return DS_BADGE_CLASSES.info;
			case 'interview':
				return DS_BADGE_CLASSES.warning;
			case 'evidence':
				return DS_BADGE_CLASSES.success;
			default:
				return DS_BADGE_CLASSES.neutral;
		}
	}

	function typeBadgeTitle(type: string): string | undefined {
		return type === 'note' ? TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP : undefined;
	}

	function parseTags(raw: string | string[] | null | undefined): string[] {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw;
		try { return JSON.parse(raw); } catch { return []; }
	}

	let linkedImagesViewerOpen = false;
	/** Notes-style kebab menu (per card instance). */
	let actionsMenuOpen = false;

	$: tags = parseTags(entry.tags);
	$: isDeleted = !!entry.deleted_at;
	$: linkedImageFiles = entry.linked_image_files ?? [];

	/** P40-02: hide lineage UI for direct manual logs (older APIs omit `provenance`). */
	$: showProvenanceBlock =
		entry.provenance != null && entry.provenance.origin_kind !== 'manual';

	// ── AI-assisted text toggle (P28-31) ────────────────────────────────────────
	let showOriginal = false;
	$: isCleaned = typeof entry.text_cleaned === 'string' && entry.text_cleaned.trim() !== '';
	$: displayText = isCleaned && !showOriginal
		? entry.text_cleaned!.trim()
		: (entry.text_original ?? '').trim();

	$: bodyHighlightSegments = splitTextForSearchHighlight(displayText, searchHighlightNeedle);

	/** Export body matches list view: active uses displayed (cleaned vs original) text; deleted uses stored original. */
	$: textForExport = isDeleted ? (entry.text_original ?? '').trim() : displayText;

	// ── Edited / version state (P28-31) ────────────────────────────────────────
	$: versionCount = entry.version_count ?? 0;
	$: isEdited = versionCount > 0;
	$: currentVersion = versionCount + 1;

	// ── Retrospective signal (P28-31) ───────────────────────────────────────────
	$: retrospectiveHours = (() => {
		try {
			const occurred = new Date(entry.occurred_at).getTime();
			const created = new Date(entry.created_at).getTime();
			if (isNaN(occurred) || isNaN(created)) return 0;
			const diffHours = (created - occurred) / (1000 * 60 * 60);
			return diffHours > 24 ? Math.round(diffHours) : 0;
		} catch {
			return 0;
		}
	})();
	$: isRetrospective = retrospectiveHours > 0;

	// ── Version history (P28-33) ────────────────────────────────────────────────
	let historyExpanded = false;
	let historyLoaded = false;
	let historyLoading = false;
	let historyError = '';
	let versionHistory: TimelineEntryVersion[] = [];

	async function expandHistoryPanel(): Promise<void> {
		if (historyExpanded) return;
		historyExpanded = true;
		if (historyLoaded) return;
		historyLoading = true;
		historyError = '';
		try {
			versionHistory = await listTimelineEntryVersions(caseId, entry.id, token);
			historyLoaded = true;
		} catch (e: unknown) {
			historyError = e instanceof Error ? e.message : 'Failed to load version history.';
		} finally {
			historyLoading = false;
		}
	}

	async function toggleHistory(): Promise<void> {
		if (!isEdited) return;
		if (historyExpanded) {
			historyExpanded = false;
			return;
		}
		await expandHistoryPanel();
	}

	function exportEntryFromMenu(format: 'txt' | 'pdf'): void {
		actionsMenuOpen = false;
		downloadTimelineEntryExport(entry, textForExport, format);
	}

	async function openVersionHistoryFromMenu(): Promise<void> {
		actionsMenuOpen = false;
		await expandHistoryPanel();
	}

	function requestRemoveFromMenu(): void {
		actionsMenuOpen = false;
		onDeleteRequest();
	}

	function sameTimestamp(a: string, b: string): boolean {
		try { return new Date(a).getTime() === new Date(b).getTime(); } catch { return a === b; }
	}

	// ── Long entry body: line-clamp + Show more / less (per card, display-only) ──
	let bodyEl: HTMLParagraphElement | undefined;
	let bodyExpanded = false;
	let showBodyClampToggle = false;
	let bodyClampMeasureKey = '';

	async function updateBodyClampState(): Promise<void> {
		await tick();
		const el = bodyEl;
		if (!el) {
			showBodyClampToggle = false;
			return;
		}
		el.classList.add('line-clamp-4', 'overflow-hidden');
		void el.offsetHeight;
		const overflows = el.scrollHeight > el.clientHeight + 2;
		el.classList.remove('line-clamp-4', 'overflow-hidden');
		if (showBodyClampToggle !== overflows) {
			showBodyClampToggle = overflows;
		}
		await tick();
	}

	afterUpdate(() => {
		const key = `${entry.id}|${displayText}`;
		if (key !== bodyClampMeasureKey) {
			bodyClampMeasureKey = key;
			bodyExpanded = false;
		}
		void updateBodyClampState();
	});
</script>

{#if isDeleted}
	<!-- ── Compact removed-state card (P28-35) ────────────────────────────────── -->
	<li
		id={`ce-timeline-entry-${entry.id}`}
		class="{DS_TIMELINE_CLASSES.entryRow} ds-timeline-entry-row--removed"
		data-testid="timeline-entry-deleted"
		data-entry-id={entry.id}
	>
		<div class="{DS_TIMELINE_CLASSES.entrySpine}" aria-hidden="true">
			<div class="{DS_TIMELINE_CLASSES.entryMarker}"></div>
		</div>
		<div class="{DS_TIMELINE_CLASSES.entryBody}">
			<div class="{DS_CARD_CLASSES.card} flex flex-col gap-1.5 min-w-0">
		<!-- Meta row: type + time + Removed badge + Restore -->
		<div class="flex items-center gap-2 flex-wrap">
			<span
				class="{timelineTypeBadgeClass(entry.type)} opacity-80"
				title={typeBadgeTitle(entry.type)}
			>
				{typeLabel(entry.type)}
			</span>
			<time
				datetime={entry.occurred_at}
				class="{DS_TYPE_CLASSES.mono}"
			>
				{formatOperationalCaseDateTimeWithSeconds(entry.occurred_at)}
			</time>
			<span
				class="{DS_BADGE_CLASSES.danger}"
				title="This entry has been removed from the active timeline. An ADMIN can restore it."
				data-testid="timeline-entry-removed-badge"
			>
				Removed from timeline
			</span>

			{#if linkedImageFiles.length > 0}
				<button
					type="button"
					class="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded
					       border border-gray-200 dark:border-gray-600
					       text-gray-500 dark:text-gray-400
					       hover:bg-gray-50 dark:hover:bg-gray-800 transition"
					title="View linked images from case files"
					data-testid="timeline-entry-linked-images-trigger"
					on:click={() => (linkedImagesViewerOpen = true)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						class="size-3.5 shrink-0 opacity-80"
						aria-hidden="true"
					>
						<path
							d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm11 0H3v7.5l2.5-2.5 3 3 2-2L13 10V3zM5.5 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
						/>
					</svg>
					{linkedImageFiles.length}
				</button>
			{/if}

		<div class="ml-auto flex items-center gap-0.5 shrink-0">
			<DropdownMenu.Root bind:open={actionsMenuOpen} onOpenChange={(s) => (actionsMenuOpen = s)}>
				<DropdownMenu.Trigger>
					<button
						type="button"
						class="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
						aria-label="More actions for this timeline entry"
						title="More actions for this timeline entry"
						data-testid="timeline-entry-actions-menu-trigger"
					>
						<EllipsisVertical />
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					class="w-full max-w-[190px] text-sm rounded-xl px-1 py-1 border border-gray-100 dark:border-gray-800 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-lg"
					sideOffset={4}
					side="bottom"
					align="end"
					transition={flyAndScale}
				>
					<DropdownMenu.Item
						class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
						on:click={() => void openVersionHistoryFromMenu()}
						data-testid="timeline-entry-menu-version-history"
					>
						<ClockRotateRight className="w-4 h-4 shrink-0" />
						<span>Version history</span>
					</DropdownMenu.Item>
					<hr class="border-gray-100 dark:border-gray-800 my-1" />
					<DropdownMenu.Item
						class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
						on:click={() => exportEntryFromMenu('txt')}
						data-testid="timeline-entry-menu-export-txt"
					>
						<Download className="w-4 h-4 shrink-0" />
						<span>Export TXT</span>
					</DropdownMenu.Item>
					<DropdownMenu.Item
						class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
						on:click={() => exportEntryFromMenu('pdf')}
						data-testid="timeline-entry-menu-export-pdf"
					>
						<Download className="w-4 h-4 shrink-0" />
						<span>Export PDF</span>
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			{#if onRestoreRequest}
				<button
					type="button"
					class="{DS_BTN_CLASSES.secondary}"
					on:click={onRestoreRequest}
					title="Restore this entry to the active timeline"
					data-testid="timeline-entry-restore-button"
				>
					Restore
				</button>
			{/if}
		</div>
		</div>

		{#if showProvenanceBlock && entry.provenance}
			<TimelineEntryProvenanceBlock {caseId} provenance={entry.provenance} />
		{/if}

		<!-- Entry text — truncated and subdued; enough to identify the entry -->
		<p
			class="text-xs text-gray-400 dark:text-gray-600 line-clamp-2 leading-relaxed"
			data-testid="timeline-entry-deleted-text"
		>
			{#each splitTextForSearchHighlight(entry.text_original ?? '', searchHighlightNeedle) as seg, hIdx (hIdx)}
				{#if seg.highlight}
					<mark
						class="{DS_TIMELINE_CLASSES.searchMark} text-inherit"
					>{seg.text}</mark>
				{:else}{seg.text}{/if}
			{/each}
		</p>

		<!-- Footer: recorded by + removed at -->
		<div
			class="flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-600
			       pt-0.5 border-t border-dashed border-red-100 dark:border-red-900/30 mt-0.5"
		>
			<span>Recorded by {entry.created_by}</span>
			<span class="ml-auto font-mono" title="Removed at this time">
				Removed {formatCaseDateTime(entry.deleted_at ?? '')}
			</span>
		</div>

		{#if historyExpanded}
			<div
				class="mt-1 pt-2 border-t border-dashed border-amber-200 dark:border-amber-800/50"
				data-testid="timeline-entry-history-panel"
			>
				<p class="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
					Version history
				</p>

				{#if historyLoading}
					<p class="text-xs text-gray-400 dark:text-gray-500 py-1" data-testid="timeline-entry-history-loading">
						Loading…
					</p>
				{:else if historyError}
					<p class="text-xs text-red-500 dark:text-red-400 py-1" data-testid="timeline-entry-history-error">
						{historyError}
					</p>
				{:else if versionHistory.length === 0}
					<p class="text-xs text-gray-400 dark:text-gray-500 py-1 italic" data-testid="timeline-entry-history-empty">
						No prior version records found.
					</p>
				{:else}
					<ol class="flex flex-col gap-3">
						{#each [...versionHistory].reverse() as ver (ver.id)}
							<li
								class="pl-3 border-l-2 border-amber-200 dark:border-amber-800/60 flex flex-col gap-1"
								data-testid="timeline-entry-version-{ver.version_number}"
							>
								<div class="flex items-center gap-2 flex-wrap">
									<span class="text-[10px] font-semibold font-mono text-amber-600 dark:text-amber-400">
										v{ver.version_number}{ver.version_number === 1 ? ' · original' : ''}
									</span>
									<span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
										changed {formatCaseDateTime(ver.changed_at)} by {ver.changed_by}
									</span>
								</div>
								<p class="text-[10px] italic text-gray-500 dark:text-gray-400">
									"{ver.change_reason}"
								</p>
								{#if !sameTimestamp(ver.prior_occurred_at, entry.occurred_at)}
									<p class="text-[10px] text-gray-400 dark:text-gray-500">
										Occurred (then):
										<span class="font-mono">{formatOperationalCaseDateTimeWithSeconds(ver.prior_occurred_at)}</span>
									</p>
								{/if}
								{#if ver.prior_type !== entry.type}
									<p class="text-[10px] text-gray-400 dark:text-gray-500">
										Type (then): {typeLabel(ver.prior_type)}
									</p>
								{/if}
								<p class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
									{ver.prior_text_original}
								</p>
								{#if ver.prior_text_cleaned}
									<p class="text-[10px] text-violet-500 dark:text-violet-400 italic">
										AI-assisted (original available) text also existed at this state.
									</p>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		{/if}

			</div>
		</div>

		<TimelineEntryLinkedImagesViewer
			show={linkedImagesViewerOpen}
			{token}
			files={linkedImageFiles}
			onClose={() => (linkedImagesViewerOpen = false)}
		/>
	</li>

{:else}
	<!-- ── Active entry card ─────────────────────────────────────────────────── -->
	<li
		id={`ce-timeline-entry-${entry.id}`}
		class="{DS_TIMELINE_CLASSES.entryRow}"
		data-testid="timeline-entry"
		data-entry-id={entry.id}
	>
		<div class="{DS_TIMELINE_CLASSES.entrySpine}" aria-hidden="true">
			<div class="{DS_TIMELINE_CLASSES.entryMarker}"></div>
		</div>
		<div class="{DS_TIMELINE_CLASSES.entryBody}">
			<div class="{DS_CARD_CLASSES.card} flex flex-col gap-2 min-w-0">
		<!-- ── Meta row: type · occurred_at (with seconds) · edited · location ── -->
		<div class="flex items-center gap-2 flex-wrap">
			<!-- Type badge -->
			<span
				class="{timelineTypeBadgeClass(entry.type)}"
				title={typeBadgeTitle(entry.type)}
			>
				{typeLabel(entry.type)}
			</span>

		<!-- occurred_at — seconds included for sub-minute sequence clarity -->
		<time
			datetime={entry.occurred_at}
			class="{DS_TYPE_CLASSES.mono}"
			title="When this occurred"
		>
			{formatOperationalCaseDateTimeWithSeconds(entry.occurred_at)}
		</time>

			<!-- Edited badge — interactive button when version_count > 0 (P28-33) -->
			{#if isEdited}
				<button
					type="button"
					class="{DS_BTN_CLASSES.ghost} text-xs py-0.5 min-h-0"
					title={historyExpanded
						? 'Collapse version history'
						: `Version ${currentVersion} — click to view history`}
					aria-expanded={historyExpanded}
					on:click={toggleHistory}
					data-testid="timeline-entry-edited"
				>
					Edited · v{currentVersion}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 12 12"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="size-2.5 transition-transform {historyExpanded ? 'rotate-180' : ''}"
						aria-hidden="true"
					>
						<path d="M2 4l4 4 4-4" />
					</svg>
				</button>
			{/if}

			<!-- Location — plain "at:" prefix, no emoji -->
			{#if entry.location_text}
				<span
					class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[16rem]"
					title={entry.location_text}
				>
					at {#each splitTextForSearchHighlight(entry.location_text, searchHighlightNeedle) as locSeg, lIdx (lIdx)}
						{#if locSeg.highlight}
							<mark
								class="{DS_TIMELINE_CLASSES.searchMark} text-inherit"
							>{locSeg.text}</mark>
						{:else}{locSeg.text}{/if}
					{/each}
				</span>
			{/if}

			{#if linkedImageFiles.length > 0}
				<button
					type="button"
					class="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded
					       border border-gray-200 dark:border-gray-600
					       text-gray-500 dark:text-gray-400
					       hover:bg-gray-50 dark:hover:bg-gray-800 transition"
					title="View linked images from case files"
					data-testid="timeline-entry-linked-images-trigger"
					on:click={() => (linkedImagesViewerOpen = true)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						class="size-3.5 shrink-0 opacity-80"
						aria-hidden="true"
					>
						<path
							d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm11 0H3v7.5l2.5-2.5 3 3 2-2L13 10V3zM5.5 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
						/>
					</svg>
					{linkedImageFiles.length}
				</button>
			{/if}
		</div>

		{#if showProvenanceBlock && entry.provenance}
			<TimelineEntryProvenanceBlock {caseId} provenance={entry.provenance} />
		{/if}

		<!-- ── AI-assisted indicator + toggle ────────────────────────────────────── -->
		{#if isCleaned}
			<div class="flex items-center gap-2">
				<span
					class="{DS_CHIP_CLASSES.base}"
					title="AI-assisted text is shown. Use the toggle to see the verbatim original."
					data-testid="timeline-entry-ai-cleaned"
				>
					AI-assisted (original available)
				</span>
				<button
					type="button"
					class="text-[10px] text-gray-400 dark:text-gray-500
					       hover:text-gray-600 dark:hover:text-gray-300
					       underline underline-offset-2 transition"
					on:click={() => (showOriginal = !showOriginal)}
					data-testid="timeline-entry-text-toggle"
				>
					{showOriginal ? 'Show cleaned' : 'Show original'}
				</button>
			</div>
		{/if}

		<!-- ── Entry body ───────────────────────────────────────────────────────── -->
		<p
			bind:this={bodyEl}
			class="{DS_TYPE_CLASSES.body} whitespace-pre-wrap leading-relaxed"
			class:line-clamp-4={showBodyClampToggle && !bodyExpanded}
			class:overflow-hidden={showBodyClampToggle && !bodyExpanded}
			data-testid="timeline-entry-body"
		>
			{#each bodyHighlightSegments as seg, bIdx (bIdx)}
				{#if seg.highlight}
					<mark
						class="{DS_TIMELINE_CLASSES.searchMark}"
					>{seg.text}</mark>
				{:else}{seg.text}{/if}
			{/each}
		</p>
		{#if showBodyClampToggle}
			<button
				type="button"
				class="mt-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400
				       hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2 transition"
				data-testid="timeline-entry-body-toggle"
				on:click={() => (bodyExpanded = !bodyExpanded)}
			>
				{bodyExpanded ? 'Show less' : 'Show more'}
			</button>
		{/if}

		<!-- ── Tags ─────────────────────────────────────────────────────────────── -->
		{#if tags.length > 0}
			<div class="flex flex-wrap gap-1 mt-0.5">
				{#each tags as tag}
					<span
						class="text-xs px-1 py-0.5 rounded
						       bg-gray-100 dark:bg-gray-800
						       text-gray-500 dark:text-gray-400 font-mono"
					>
						{tag}
					</span>
				{/each}
			</div>
		{/if}

	<!-- ── Footer: recorded by · retrospective signal · actions ────────────── -->
	<div class="flex items-center gap-2 flex-wrap pt-1.5 border-t border-[color:var(--ds-border-subtle)] mt-0.5">
		<span class="{DS_TYPE_CLASSES.meta}">
			Recorded
			<time datetime={entry.created_at} class="{DS_TYPE_CLASSES.mono}">
				{formatCaseDateTime(entry.created_at)}
			</time>
			by <span class="{DS_TYPE_CLASSES.label}">{entry.created_by}</span>
		</span>

		{#if isRetrospective}
			<span
				class="{DS_CHIP_CLASSES.base}"
				title="Logged approximately {retrospectiveHours} hours after the event occurred."
				data-testid="timeline-entry-retrospective"
			>
				Logged +{retrospectiveHours}h after occurrence
			</span>
		{/if}

		<!-- Primary Edit + Notes-style ⋮ menu (Version history, exports, Remove) -->
		<div class="ml-auto flex items-center gap-1">
			<button
				type="button"
				class="{DS_BTN_CLASSES.secondary}"
				on:click={onEditRequest}
				title="Edit this timeline entry"
				data-testid="timeline-entry-edit-button"
			>
				Edit
			</button>
			<DropdownMenu.Root bind:open={actionsMenuOpen} onOpenChange={(s) => (actionsMenuOpen = s)}>
				<DropdownMenu.Trigger>
					<button
						type="button"
						class="p-1 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
						aria-label="More actions for this timeline entry"
						title="More actions for this timeline entry"
						data-testid="timeline-entry-actions-menu-trigger"
					>
						<EllipsisVertical />
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					class="w-full max-w-[190px] text-sm rounded-xl px-1 py-1 border border-gray-100 dark:border-gray-800 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-lg"
					sideOffset={4}
					side="bottom"
					align="end"
					transition={flyAndScale}
				>
					<DropdownMenu.Item
						class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
						on:click={() => void openVersionHistoryFromMenu()}
						data-testid="timeline-entry-menu-version-history"
					>
						<ClockRotateRight className="w-4 h-4 shrink-0" />
						<span>Version history</span>
					</DropdownMenu.Item>
					<hr class="border-gray-100 dark:border-gray-800 my-1" />
					<DropdownMenu.Item
						class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
						on:click={() => exportEntryFromMenu('txt')}
						data-testid="timeline-entry-menu-export-txt"
					>
						<Download className="w-4 h-4 shrink-0" />
						<span>Export TXT</span>
					</DropdownMenu.Item>
					<DropdownMenu.Item
						class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
						on:click={() => exportEntryFromMenu('pdf')}
						data-testid="timeline-entry-menu-export-pdf"
					>
						<Download className="w-4 h-4 shrink-0" />
						<span>Export PDF</span>
					</DropdownMenu.Item>
					<hr class="border-gray-100 dark:border-gray-800 my-1" />
					<DropdownMenu.Item
						class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg"
						on:click={requestRemoveFromMenu}
						data-testid="timeline-entry-delete-button"
					>
						<GarbageBin className="w-4 h-4 shrink-0" />
						<span>Remove</span>
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
		</div>

		<!-- ── Inline version history (P28-33) ──────────────────────────────────── -->
		{#if historyExpanded}
			<div
				class="mt-1 pt-2 border-t border-dashed border-amber-200 dark:border-amber-800/50"
				data-testid="timeline-entry-history-panel"
			>
				<p class="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-2">
					Version history
				</p>

				{#if historyLoading}
					<p class="text-xs text-gray-400 dark:text-gray-500 py-1" data-testid="timeline-entry-history-loading">
						Loading…
					</p>
				{:else if historyError}
					<p class="text-xs text-red-500 dark:text-red-400 py-1" data-testid="timeline-entry-history-error">
						{historyError}
					</p>
				{:else if versionHistory.length === 0}
					<p class="text-xs text-gray-400 dark:text-gray-500 py-1 italic" data-testid="timeline-entry-history-empty">
						No prior version records found.
					</p>
				{:else}
					<ol class="flex flex-col gap-3">
						{#each [...versionHistory].reverse() as ver (ver.id)}
							<li
								class="pl-3 border-l-2 border-amber-200 dark:border-amber-800/60 flex flex-col gap-1"
								data-testid="timeline-entry-version-{ver.version_number}"
							>
								<div class="flex items-center gap-2 flex-wrap">
									<span class="text-[10px] font-semibold font-mono text-amber-600 dark:text-amber-400">
										v{ver.version_number}{ver.version_number === 1 ? ' · original' : ''}
									</span>
									<span class="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
										changed {formatCaseDateTime(ver.changed_at)} by {ver.changed_by}
									</span>
								</div>
								<p class="text-[10px] italic text-gray-500 dark:text-gray-400">
									"{ver.change_reason}"
								</p>
								{#if !sameTimestamp(ver.prior_occurred_at, entry.occurred_at)}
									<p class="text-[10px] text-gray-400 dark:text-gray-500">
										Occurred (then):
										<span class="font-mono">{formatOperationalCaseDateTimeWithSeconds(ver.prior_occurred_at)}</span>
									</p>
								{/if}
								{#if ver.prior_type !== entry.type}
									<p class="text-[10px] text-gray-400 dark:text-gray-500">
										Type (then): {typeLabel(ver.prior_type)}
									</p>
								{/if}
								<p class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
									{ver.prior_text_original}
								</p>
								{#if ver.prior_text_cleaned}
									<p class="text-[10px] text-violet-500 dark:text-violet-400 italic">
										AI-assisted (original available) text also existed at this state.
									</p>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		{/if}

			</div>
		</div>

		<TimelineEntryLinkedImagesViewer
			show={linkedImagesViewerOpen}
			{token}
			files={linkedImageFiles}
			onClose={() => (linkedImagesViewerOpen = false)}
		/>
	</li>
{/if}
