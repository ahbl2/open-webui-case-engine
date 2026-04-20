<script lang="ts">
	/**
	 * TimelineEntryCard — P28-31 Truth Visibility Pass, P28-33 Version History Indicator,
	 *                     P28-34 Edit Surface, P28-35 Soft-Delete + Restore UI,
	 *                     P28-38 Usability Polish Pass
	 *                     P38-08 — type “note” vs Notes tab (labels/tooltips only)
	 *                     P39-02A — optional search match highlight (normalized needle from parent)
	 *                     P83-01 — standardized row layout (type column, occurred_at primary, body, metadata line)
	 *                     P83-04 — long body: line-clamp preview + Show more / Show less (CSS only; full text on expand)
	 *                     P95-01 — standardized 5-line collapsed preview, body block hierarchy, no text mutation
	 *                     P95-02 — metadata labeling, grouping, hierarchy (presentation only; values unchanged)
	 *                     P95-03 — deleted-card inline strip for linked images only; origin/lineage via footer popover
	 *                     P95-04 — interaction polish: hover/focus-visible + hit targets (existing controls only)
	 *                     P95-05 — cross-entry spacing rhythm; unified section stack (no IA change)
	 *                     P124-03 — type/main column gap + DS row/card rhythm (layout only; no ordering)
	 *                     P83-05 — metadata line consistency (order, separators, type display; trim only; no new fields)
	 *                     P83-02 — explicit occurred labels + tooltips (no timestamp logic changes)
	 *                     P124-02 — clearer occurred_at and optional By (created_by) labeling (copy + layout only)
	 *                     P83-03 — readability + scanning (spacing, hierarchy, body line rhythm; see detectiveSurfaces.css)
	 *                     P84-01 — local-only review flag (not persisted; no ordering/filter changes)
	 *                     P84-02 — flagged row scan affordance (CSS in detectiveSurfaces.css; no new controls)
	 *                     P84-03 — local-only entry pairing (parent state on timeline page; not persisted)
	 *                     P84-04 — local-only follow-up marker (parent Set on timeline page; not persisted)
	 *                     P84-05 — ops toolbar consistency (shared chrome, titles, combined-state contract)
	 *                     P109-01 — manual evidence selection checkbox (active entries only; session-only store)
	 *
	 * Truth signals (P28-31):
	 *   1. AI-assisted transparency — purple AI emblem opens popover with original entry text
	 *   2. Edited badge — derived from version_count (0 = untouched)
	 *   3. occurred_at with seconds — prevents same-minute sequence ambiguity
	 *   4. Attribution contrast — slightly more visible (text-gray-500)
	 *   5. Location: label + value (P95-02); entry text unchanged
	 *
	 * Version history (P28-33):
	 *   - `Edited · vN` badge is a button that expands/collapses inline version history (footer row, left of ⋮)
	 *   - Lazy-loaded on first expand; cached for session
	 *
	 * Lifecycle (P28-35):
	 *   - Active entries: Edit in ⋮ menu; other actions in the same menu
	 *   - Deleted entries (entry.deleted_at set) render a compact removed-state view
	 *   - onRestoreRequest (ADMIN only) shown for deleted entries
	 */
	import { tick, afterUpdate } from 'svelte';
	import { DropdownMenu, Popover } from 'bits-ui';
	import { flyAndScale } from '$lib/utils/transitions';
	import type { TimelineEntry, TimelineEntryVersion } from '$lib/apis/caseEngine';
	import { listTimelineEntryVersions } from '$lib/apis/caseEngine';
	import {
		TIMELINE_TYPE_NOTE_DISPLAY_LABEL,
		TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP
	} from '$lib/caseTimeline/timelineTypeNoteClarity';
	import { splitTextForSearchHighlight } from '$lib/caseTimeline/timelineSearchUx';
	import { TIMELINE_ENTRY_BODY_LINE_CLAMP_TAILWIND } from '$lib/caseTimeline/timelineEntryBodyDisplay';
	import {
		timelineTypeBadgeClass,
		timelineTypeOccBorderClass,
		timelineTypeOccHeadingClass,
		timelineTypeSpineMarkerClass
	} from '$lib/caseTimeline/timelineEntryTypeAccents';
	import {
		formatOperationalCaseDateTimeWithSeconds,
		formatCaseDateTime
	} from '$lib/utils/formatDateTime';
	import TimelineEntryLinkedImagesViewer from './TimelineEntryLinkedImagesViewer.svelte';
	import TimelineEntryProvenanceBlock from './TimelineEntryProvenanceBlock.svelte';
	import SynthesisNavigationContextPreview from './SynthesisNavigationContextPreview.svelte';
	import EllipsisVertical from '$lib/components/icons/EllipsisVertical.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import ClockRotateRight from '$lib/components/icons/ClockRotateRight.svelte';
	import Download from '$lib/components/icons/Download.svelte';
	import GarbageBin from '$lib/components/icons/GarbageBin.svelte';
	import { downloadTimelineEntryExport } from '$lib/caseTimeline/timelineEntryExport';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_CARD_CLASSES,
		DS_TIMELINE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { P109_EVIDENCE_SELECTION_TIMELINE_TOGGLE_TITLE } from '$lib/case/p109EvidenceSelectionCopy';
	import {
		P124_TIMELINE_LABEL_EVENT_OCCURRED,
		P124_TIMELINE_LABEL_LOGGED_BY,
		P124_TIMELINE_TOOLTIP_CREATED_BY,
		P124_TIMELINE_TOOLTIP_OCCURRED_AT
	} from '$lib/caseContext/p124TimelineMetadataLabels';

	/** P95-02 — metadata row labels (presentation only; no data changes) */
	const TIMELINE_META_LABEL_TYPE = 'Type';
	const TIMELINE_META_LABEL_TAGS = 'Tags';
	const TIMELINE_META_LABEL_LOCATION = 'Location';

	/** P95-03 — linked files row label (presentation only) */
	const TIMELINE_CONTEXT_LABEL_LINKED_IMAGES = 'Linked images';

	const TIMELINE_LINEAGE_TRIGGER_TITLE = 'Origin and lineage — how this entry was added to the record';

	const TIMELINE_AI_ORIGINAL_HEADING = 'Original timeline entry';
	const TIMELINE_AI_EMBLEM_TITLE =
		'AI-assisted text is shown below. Open to read the verbatim original timeline entry.';

	/** P84-05 — Ops toolbar (flag → relate → follow-up): shared chrome + session-only titles */
	const TIMELINE_OPS_BTN =
		'inline-flex items-center justify-center min-h-7 min-w-7 shrink-0 rounded-md p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition';
	const TIMELINE_OPS_FOCUS_FLAG =
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900';
	const TIMELINE_OPS_FOCUS_RELATE =
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/45 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900';
	const TIMELINE_OPS_FOCUS_FOLLOWUP =
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900';
	const TIMELINE_OPS_TITLE_FLAG = 'Attention during review. Not saved (session only).';
	const TIMELINE_OPS_TITLE_RELATE =
		'Visual link between two entries (context). Not saved (session only).';
	const TIMELINE_OPS_TITLE_FOLLOWUP = 'Follow-up reminder. Not saved (session only).';
	const TIMELINE_OPS_FOCUS_LINEAGE =
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900';

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
	/** P84-03 — pending source id for 1:1 relate pairing (timeline page scope only). */
	export let relationshipPendingId: string | null = null;
	/** P84-03 — sorted pair of entry ids when paired; null when idle or pending only. */
	export let relationshipPair: { a: string; b: string } | null = null;
	/** P84-03 — relate control clicked (parent runs pairing state machine). */
	export let onRelateClick: () => void = () => {};
	/** P84-04 — whether this entry id is in the page follow-up Set. */
	export let entryNeedsFollowUp = false;
	/** P84-04 — follow-up toggle (parent mutates Set). */
	export let onFollowUpClick: () => void = () => {};
	/** P97-02 — transient read-only synthesis navigation confirmation (not selection routing state). */
	export let synthesisNavigationReveal = false;
	/** P97-04 — ephemeral orientation copy (subordinate to the row; cleared with reveal highlight). */
	export let synthesisNavigationContextPreview: { headline: string; lines: string[] } | null = null;

	/** P109-01 — manual evidence selection (active entries only; parent gates on `!entry.deleted_at`). */
	export let manualEvidenceSelectionEnabled = false;
	export let manualEvidenceSelected = false;
	export let onManualEvidenceSelectionToggle: () => void = () => {};
	/**
	 * When true, render a `div` shell without the spine (parent `/timeline` row provides
	 * `TimelineEntryLeftRail` + this block inside an `<li>`).
	 */
	export let embeddedInTimelineRow = false;

	const TYPE_LABELS: Record<string, string> = {
		note:             TIMELINE_TYPE_NOTE_DISPLAY_LABEL,
		incident:         'Incident',
		controlled_buy:   'Controlled buy',
		search_warrant:   'Search warrant',
		surveillance:     'Surveillance',
		interview:        'Interview',
		evidence:         'Evidence'
	};

	/** P83-05 — display-only; known types use product labels; unknown → title-cased tokens (no API renames). */
	function typeLabel(type: string): string {
		const raw = (type ?? '').trim();
		if (!raw) return '';
		const lower = raw.toLowerCase();
		const known = TYPE_LABELS[lower];
		if (known !== undefined) return known;
		return raw
			.split(/[_\s-]+/)
			.filter(Boolean)
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join(' ');
	}

	function typeBadgeTitle(type: string): string | undefined {
		return (type ?? '').trim().toLowerCase() === 'note' ? TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP : undefined;
	}

	function typeHeadingUpper(type: string): string {
		return typeLabel(type).toUpperCase();
	}

	/** Shorten UUID-like actor ids in dense footers (full value stays in title). */
	function formatActorForDisplay(raw: string): string {
		const t = raw.trim();
		if (!t) return '';
		if (/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(t)) {
			return `${t.slice(0, 8)}…`;
		}
		return t;
	}

	function parseTags(raw: string | string[] | null | undefined): string[] {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw;
		try { return JSON.parse(raw); } catch { return []; }
	}

	let linkedImagesViewerOpen = false;
	/** Origin / lineage popover (per card). */
	let lineagePopoverOpen = false;
	/** AI original text popover (cleaned entries only). */
	let aiOriginalPopoverOpen = false;
	/** Notes-style kebab menu (per card instance). */
	let actionsMenuOpen = false;

	/** P84-01 — local review flag; not persisted; lost on refresh/navigation/remount. */
	let entryFlagged = false;

	function toggleEntryFlag(): void {
		entryFlagged = !entryFlagged;
	}

	/** P84-03 — derive labels / card class from parent pairing state (no local persistence). */
	$: relatePaired =
		relationshipPair !== null &&
		(relationshipPair.a === entry.id || relationshipPair.b === entry.id);
	$: relatePendingSource = relationshipPendingId === entry.id && relationshipPair === null;
	$: relateOtherPending =
		relationshipPendingId !== null && relationshipPendingId !== entry.id && relationshipPair === null;
	$: relateLabel =
		relatePaired || relatePendingSource
			? 'Clear relationship'
			: relateOtherPending
				? 'Relate to selected entry'
				: 'Select for relationship';
	$: relateAriaPressed = relatePaired || relatePendingSource;

	$: tags = parseTags(entry.tags);
	$: isDeleted = !!entry.deleted_at;
	$: linkedImageFiles = entry.linked_image_files ?? [];

	/** P40-02: hide lineage UI for direct manual logs (older APIs omit `provenance`). */
	$: showProvenanceBlock =
		entry.provenance != null && entry.provenance.origin_kind !== 'manual';

	/** P95-03 — soft-deleted entries only: linked images row when present (provenance is in footer popover). */
	$: showDeletedInlineLinkedStrip = isDeleted && linkedImageFiles.length > 0;

	// ── AI-assisted text (P28-31): main body shows cleaned; verbatim original in popover ──
	$: isCleaned = typeof entry.text_cleaned === 'string' && entry.text_cleaned.trim() !== '';
	$: displayText = isCleaned ? entry.text_cleaned!.trim() : (entry.text_original ?? '').trim();

	$: bodyHighlightSegments = splitTextForSearchHighlight(displayText, searchHighlightNeedle);

	/** Export body matches list view: active uses displayed (cleaned vs original) text; deleted uses stored original. */
	$: textForExport = isDeleted ? (entry.text_original ?? '').trim() : displayText;

	// ── Edited / version state (P28-31) ────────────────────────────────────────
	$: versionCount = entry.version_count ?? 0;
	$: currentVersion = versionCount + 1;

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

	function exportEntryFromMenu(format: 'txt' | 'pdf'): void {
		actionsMenuOpen = false;
		downloadTimelineEntryExport(entry, textForExport, format);
	}

	async function openVersionHistoryFromMenu(): Promise<void> {
		actionsMenuOpen = false;
		await expandHistoryPanel();
	}

	function openLineageFromMenu(): void {
		actionsMenuOpen = false;
		lineagePopoverOpen = true;
	}

	function requestRemoveFromMenu(): void {
		actionsMenuOpen = false;
		onDeleteRequest();
	}

	function sameTimestamp(a: string, b: string): boolean {
		try { return new Date(a).getTime() === new Date(b).getTime(); } catch { return a === b; }
	}

	$: metadataLocationRaw = entry.location_text?.trim() ?? '';
	/** Prefer human-readable name from API; shorten UUID-like ids only when no name. */
	$: creatorDisplayLabel = (() => {
		const name = entry.created_by_name?.trim();
		if (name) return name;
		return formatActorForDisplay(entry.created_by?.trim() ?? '');
	})();
	$: creatorTooltipRaw = entry.created_by_name?.trim() || entry.created_by?.trim() || '';
	$: hasMetadataLocation = metadataLocationRaw.length > 0;
	$: hasMetadataCreator = creatorTooltipRaw.length > 0;

	// ── P83-04 / P95-01 — Body expand/collapse (local state; CSS line-clamp; no content mutation) ──
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
		el.classList.add(TIMELINE_ENTRY_BODY_LINE_CLAMP_TAILWIND, 'overflow-hidden');
		void el.offsetHeight;
		const overflows = el.scrollHeight > el.clientHeight + 2;
		el.classList.remove(TIMELINE_ENTRY_BODY_LINE_CLAMP_TAILWIND, 'overflow-hidden');
		if (showBodyClampToggle !== overflows) {
			showBodyClampToggle = overflows;
		}
		await tick();
	}

	afterUpdate(() => {
		const key = isDeleted
			? `del:${entry.id}:${entry.text_original ?? ''}:${searchHighlightNeedle}`
			: `act:${entry.id}:${displayText}:${searchHighlightNeedle}`;
		if (key !== bodyClampMeasureKey) {
			bodyClampMeasureKey = key;
			bodyExpanded = false;
		}
		void updateBodyClampState();
	});

	// P85-03 — When an entry becomes soft-deleted in place (same row id stays mounted), clear local-only
	// UI state so review flag / expand / version panel / menus do not leak from the active card view.
	let prevIsDeleted = false;
	$: {
		if (isDeleted && !prevIsDeleted) {
			entryFlagged = false;
			bodyExpanded = false;
			historyExpanded = false;
			actionsMenuOpen = false;
			lineagePopoverOpen = false;
			aiOriginalPopoverOpen = false;
			linkedImagesViewerOpen = false;
		}
		prevIsDeleted = isDeleted;
	}
</script>

{#if isDeleted}
	<!-- ── Compact removed-state card (P28-35) ────────────────────────────────── -->
	<svelte:element
		this={embeddedInTimelineRow ? 'div' : 'li'}
		id={`ce-timeline-entry-${entry.id}`}
		class="{embeddedInTimelineRow
			? 'ds-timeline-entry-embedded-shell min-w-0 flex flex-1 flex-col'
			: `${DS_TIMELINE_CLASSES.entryRow} ds-timeline-entry-row--removed`}{synthesisNavigationReveal
			? ' ds-p97-synthesis-nav-reveal'
			: ''}"
		data-testid="timeline-entry-deleted"
		data-entry-id={entry.id}
		data-synthesis-timeline-reveal={synthesisNavigationReveal ? '1' : '0'}
		data-timeline-row-flagged={entryFlagged ? '1' : '0'}
		data-timeline-row-related={relatePaired ? '1' : '0'}
		data-timeline-row-followup={entryNeedsFollowUp ? '1' : '0'}
	>
		{#if !embeddedInTimelineRow}
			<div class="{DS_TIMELINE_CLASSES.entrySpine}" aria-hidden="true">
				<div class="{DS_TIMELINE_CLASSES.entryMarker}"></div>
			</div>
		{/if}
		<div class="{DS_TIMELINE_CLASSES.entryBody}{embeddedInTimelineRow ? ' min-w-0 flex-1 flex flex-col' : ''}">
			{#if synthesisNavigationReveal && synthesisNavigationContextPreview}
				<SynthesisNavigationContextPreview
					role="authoritative"
					surface="timeline"
					headline={synthesisNavigationContextPreview.headline}
					lines={synthesisNavigationContextPreview.lines}
				/>
			{/if}
			<div
				class="{DS_CARD_CLASSES.card} min-w-0 {entryFlagged ? 'ds-timeline-entry-card--review-flagged' : ''}{relatePaired
					? ' ds-timeline-entry-card--relationship-paired'
					: ''}{entryNeedsFollowUp ? ' ds-timeline-entry-card--followup-marked' : ''}"
				data-timeline-card-flagged={entryFlagged ? '1' : '0'}
				data-timeline-card-related={relatePaired ? '1' : '0'}
				data-timeline-card-followup={entryNeedsFollowUp ? '1' : '0'}
			>
				<div class="flex gap-5 min-w-0">
					<div
						class="shrink-0 w-[7.25rem] max-w-[28%] sm:max-w-none pt-0.5 ds-timeline-entry-type-column"
						data-testid="timeline-entry-type-column"
					>
						<span
							class="ds-timeline-entry-meta-label {DS_TYPE_CLASSES.meta}"
							title="Entry type"
							id={`ce-timeline-entry-type-label-${entry.id}`}
						>{TIMELINE_META_LABEL_TYPE}</span>
						<span
							class="{timelineTypeBadgeClass(entry.type)} opacity-80"
							title={typeBadgeTitle(entry.type)}
							data-testid="timeline-entry-type-badge"
							aria-labelledby={`ce-timeline-entry-type-label-${entry.id}`}
						>
							{typeLabel(entry.type)}
						</span>
					</div>
					<div class="flex-1 min-w-0 ds-timeline-entry-row__main">
						<div class="ds-timeline-entry-row__top">
							<div class="ds-timeline-entry-metadata-primary min-w-0">
								<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0">
								<span
									class="ds-timeline-entry-meta-label {DS_TYPE_CLASSES.meta} shrink-0"
									id={`ce-timeline-entry-occurred-label-${entry.id}`}
									title={P124_TIMELINE_TOOLTIP_OCCURRED_AT}
								>{P124_TIMELINE_LABEL_EVENT_OCCURRED}</span>
								<time
									datetime={entry.occurred_at}
									class="text-base font-semibold tabular-nums text-[color:var(--ds-fg)] {DS_TYPE_CLASSES.mono}"
									title={P124_TIMELINE_TOOLTIP_OCCURRED_AT}
									data-testid="timeline-entry-occurred-at"
									aria-labelledby={`ce-timeline-entry-occurred-label-${entry.id}`}
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
								</div>
							</div>
							<div class="ds-timeline-entry-row__top-actions">
								<button
									type="button"
									class="{TIMELINE_OPS_BTN} {TIMELINE_OPS_FOCUS_FLAG} {entryFlagged
										? 'text-amber-600 dark:text-amber-400 ds-timeline-entry-flag-toggle--active'
										: ''}"
									aria-pressed={entryFlagged}
									aria-label={entryFlagged ? 'Unflag entry' : 'Flag entry'}
									title={TIMELINE_OPS_TITLE_FLAG}
									data-testid="timeline-entry-flag-toggle"
									data-timeline-review-flag={entryFlagged ? '1' : '0'}
									on:click|stopPropagation={toggleEntryFlag}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-4 shrink-0"
										aria-hidden="true"
									>
										<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
										<line x1="4" x2="4" y1="22" y2="15" />
									</svg>
								</button>
								<button
									type="button"
									class="{TIMELINE_OPS_BTN} {TIMELINE_OPS_FOCUS_RELATE} {relatePendingSource
										? 'ds-timeline-entry-relate-toggle--pending'
										: ''} {relatePaired ? 'ds-timeline-entry-relate-toggle--paired' : ''}"
									aria-pressed={relateAriaPressed}
									aria-label={relateLabel}
									title={TIMELINE_OPS_TITLE_RELATE}
									data-testid="timeline-entry-relate-toggle"
									data-timeline-relate-paired={relatePaired ? '1' : '0'}
									on:click|stopPropagation={onRelateClick}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-4 shrink-0"
										aria-hidden="true"
									>
										<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
										<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
									</svg>
								</button>
								<button
									type="button"
									class="{TIMELINE_OPS_BTN} {TIMELINE_OPS_FOCUS_FOLLOWUP} {entryNeedsFollowUp
										? 'ds-timeline-entry-followup-toggle--active'
										: ''}"
									aria-pressed={entryNeedsFollowUp}
									aria-label={entryNeedsFollowUp ? 'Remove follow-up marker' : 'Mark for follow-up'}
									title={TIMELINE_OPS_TITLE_FOLLOWUP}
									data-testid="timeline-followup-toggle"
									data-timeline-followup-toggle={entryNeedsFollowUp ? '1' : '0'}
									on:click|stopPropagation={onFollowUpClick}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-4 shrink-0"
										aria-hidden="true"
									>
										<rect width="8" height="4" x="8" y="2" rx="1" ry="1" fill="none" />
										<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
										<path d="M9 12h6" />
										<path d="M9 16h6" />
									</svg>
								</button>
								{#if showProvenanceBlock && entry.provenance}
									<Popover.Root bind:open={lineagePopoverOpen} onOpenChange={(o) => (lineagePopoverOpen = o)}>
										<Popover.Trigger
											class="{TIMELINE_OPS_BTN} {TIMELINE_OPS_FOCUS_LINEAGE} ds-timeline-entry-lineage-trigger text-gray-400 dark:text-gray-500 hover:text-sky-700 dark:hover:text-sky-300"
											aria-expanded={lineagePopoverOpen}
											aria-label="Origin and lineage"
											title={TIMELINE_LINEAGE_TRIGGER_TITLE}
											data-testid="timeline-entry-lineage-trigger"
											type="button"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="size-4 shrink-0"
												aria-hidden="true"
											>
												<line x1="6" x2="6" y1="3" y2="15" />
												<circle cx="18" cy="6" r="3" />
												<circle cx="6" cy="18" r="3" />
												<path d="M18 9a9 9 0 0 1-9 9" />
											</svg>
										</Popover.Trigger>
										<Popover.Content
											class="z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 p-0 shadow-xl outline-none"
											side="top"
											sideOffset={8}
											align="end"
											collisionPadding={12}
										>
											<div
												class="p-3"
												data-testid="timeline-entry-context-origin"
											>
												<TimelineEntryProvenanceBlock
													variant="panel"
													{caseId}
													provenance={entry.provenance}
												/>
											</div>
										</Popover.Content>
									</Popover.Root>
								{/if}
								<DropdownMenu.Root bind:open={actionsMenuOpen} onOpenChange={(s) => (actionsMenuOpen = s)}>
									<DropdownMenu.Trigger>
										<button
											type="button"
											class="ds-timeline-entry-actions-menu-btn"
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
											class="ds-timeline-entry-version-history-item select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
											on:click={() => void openVersionHistoryFromMenu()}
											data-testid="timeline-entry-menu-version-history"
										>
											<ClockRotateRight className="w-4 h-4 shrink-0" />
											<span class="flex flex-col items-start gap-0 leading-tight">
												<span>Version history</span>
												<span class="text-[10px] font-normal text-gray-500 dark:text-gray-400">Now v{currentVersion}</span>
											</span>
										</DropdownMenu.Item>
										{#if showProvenanceBlock && entry.provenance}
											<DropdownMenu.Item
												class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
												on:click={openLineageFromMenu}
												data-testid="timeline-entry-menu-origin-lineage"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
													class="w-4 h-4 shrink-0"
													aria-hidden="true"
												>
													<line x1="6" x2="6" y1="3" y2="15" />
													<circle cx="18" cy="6" r="3" />
													<circle cx="6" cy="18" r="3" />
													<path d="M18 9a9 9 0 0 1-9 9" />
												</svg>
												<span>Origin &amp; lineage</span>
											</DropdownMenu.Item>
										{/if}
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

						{#if showDeletedInlineLinkedStrip}
							<div
								class="ds-timeline-entry-inline-context min-w-0"
								data-testid="timeline-entry-inline-context"
							>
								<div
									class="ds-timeline-entry-linked-files-row flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0"
									data-testid="timeline-entry-linked-files-row"
								>
									<span
										class="ds-timeline-entry-meta-label {DS_TYPE_CLASSES.meta} shrink-0"
										id={`ce-timeline-entry-linked-images-label-${entry.id}`}
									>{TIMELINE_CONTEXT_LABEL_LINKED_IMAGES}</span>
									<button
										type="button"
										class="ds-timeline-entry-linked-images-trigger inline-flex items-center gap-0.5 text-[10px] font-medium px-2 py-1 rounded border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
										title="View linked images from case files"
										data-testid="timeline-entry-linked-images-trigger"
										aria-labelledby={`ce-timeline-entry-linked-images-label-${entry.id}`}
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
								</div>
							</div>
						{/if}

						<div class="ds-timeline-entry-body-block min-w-0" data-testid="timeline-entry-body-block">
							<p
								bind:this={bodyEl}
								class="ds-timeline-entry-body-primary ds-timeline-entry-text--removed text-gray-500 dark:text-gray-500 whitespace-pre-wrap break-words"
								class:line-clamp-5={showBodyClampToggle && !bodyExpanded}
								class:overflow-hidden={showBodyClampToggle && !bodyExpanded}
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
							{#if showBodyClampToggle}
								<button
									type="button"
									class="ds-timeline-entry-body-toggle text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 underline underline-offset-2"
									data-testid="timeline-entry-body-toggle"
									aria-expanded={bodyExpanded}
									on:click={() => (bodyExpanded = !bodyExpanded)}
								>
									{bodyExpanded ? 'Show less' : 'Show more'}
								</button>
							{/if}
						</div>

						{#if hasMetadataLocation || hasMetadataCreator}
							<div
								class="ds-timeline-entry-metadata-secondary min-w-0"
								data-testid="timeline-entry-metadata-secondary"
							>
								<div
									class="ds-timeline-entry-row__meta-line flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-gray-500/90 dark:text-gray-400/90 {DS_TYPE_CLASSES.meta}"
									data-testid="timeline-entry-metadata-line"
								>
									{#if hasMetadataLocation}
										<span class="min-w-0 break-words" title={metadataLocationRaw} data-testid="timeline-entry-location">
											<span class="ds-timeline-entry-meta-label {DS_TYPE_CLASSES.meta} mr-1">{TIMELINE_META_LABEL_LOCATION}</span>
											{#each splitTextForSearchHighlight(metadataLocationRaw, searchHighlightNeedle) as locSeg, lIdx (lIdx)}
												{#if locSeg.highlight}
													<mark
														class="{DS_TIMELINE_CLASSES.searchMark} text-inherit"
													>{locSeg.text}</mark>
												{:else}{locSeg.text}{/if}
											{/each}
										</span>
									{/if}
									{#if hasMetadataLocation && hasMetadataCreator}
										<span class="shrink-0 text-gray-400/80 dark:text-gray-500/80 select-none" aria-hidden="true">·</span>
									{/if}
									{#if hasMetadataCreator}
										<span data-testid="timeline-entry-entered-by" title={P124_TIMELINE_TOOLTIP_CREATED_BY}>
											<span class="ds-timeline-entry-meta-label {DS_TYPE_CLASSES.meta} mr-1">{P124_TIMELINE_LABEL_LOGGED_BY}</span>
											<span class="{DS_TYPE_CLASSES.label}">{creatorDisplayLabel}</span>
										</span>
									{/if}
								</div>
							</div>
						{/if}

						<div
							class="ds-timeline-entry-row__footer ds-timeline-entry-row__footer--removed flex items-center gap-2 flex-wrap text-[10px] text-gray-400 dark:text-gray-600"
						>
							<span class="ml-auto font-mono" title="When this entry was removed from the timeline.">
								Removed {formatCaseDateTime(entry.deleted_at ?? '')}
							</span>
						</div>

		{#if historyExpanded}
			<div
				class="ds-timeline-entry-history-panel"
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
										Event occurred (then):
										<span class="font-mono">{formatOperationalCaseDateTimeWithSeconds(ver.prior_occurred_at)}</span>
									</p>
								{/if}
								{#if ver.prior_type !== entry.type}
									<p class="text-[10px] text-gray-400 dark:text-gray-500">
										Type (then): {typeLabel(ver.prior_type)}
									</p>
								{/if}
								{#if (ver.prior_title ?? '').trim() !== ''}
									<p class="text-[10px] text-gray-400 dark:text-gray-500">
										Title (then): {(ver.prior_title ?? '').trim()}
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
			</div>
		</div>

		<TimelineEntryLinkedImagesViewer
			show={linkedImagesViewerOpen}
			{token}
			files={linkedImageFiles}
			onClose={() => (linkedImagesViewerOpen = false)}
		/>
	</svelte:element>

{:else}
	<!-- ── Active entry card ─────────────────────────────────────────────────── -->
	<svelte:element
		this={embeddedInTimelineRow ? 'div' : 'li'}
		id={`ce-timeline-entry-${entry.id}`}
		class="{embeddedInTimelineRow
			? 'ds-timeline-entry-embedded-shell min-w-0 flex flex-1 flex-col'
			: DS_TIMELINE_CLASSES.entryRow}{synthesisNavigationReveal ? ' ds-p97-synthesis-nav-reveal' : ''}"
		data-testid="timeline-entry"
		data-entry-id={entry.id}
		data-synthesis-timeline-reveal={synthesisNavigationReveal ? '1' : '0'}
		data-timeline-row-flagged={entryFlagged ? '1' : '0'}
		data-timeline-row-related={relatePaired ? '1' : '0'}
		data-timeline-row-followup={entryNeedsFollowUp ? '1' : '0'}
	>
		{#if !embeddedInTimelineRow}
			<div class="{DS_TIMELINE_CLASSES.entrySpine}" aria-hidden="true">
				<div
					class="{DS_TIMELINE_CLASSES.entryMarker} {timelineTypeSpineMarkerClass(entry.type)}"
				></div>
			</div>
		{/if}
		<div class="{DS_TIMELINE_CLASSES.entryBody}{embeddedInTimelineRow ? ' min-w-0 flex-1 flex flex-col' : ''}">
			{#if synthesisNavigationReveal && synthesisNavigationContextPreview}
				<SynthesisNavigationContextPreview
					role="authoritative"
					surface="timeline"
					headline={synthesisNavigationContextPreview.headline}
					lines={synthesisNavigationContextPreview.lines}
				/>
			{/if}
			<div
				class="{DS_CARD_CLASSES.card} ds-timeline-entry-card--occ min-w-0 {timelineTypeOccBorderClass(entry.type)} {entryFlagged
					? 'ds-timeline-entry-card--review-flagged'
					: ''}{relatePaired ? ' ds-timeline-entry-card--relationship-paired' : ''}{entryNeedsFollowUp
					? ' ds-timeline-entry-card--followup-marked'
					: ''}"
				data-timeline-card-flagged={entryFlagged ? '1' : '0'}
				data-timeline-card-related={relatePaired ? '1' : '0'}
				data-timeline-card-followup={entryNeedsFollowUp ? '1' : '0'}
				data-entry-type={entry.type}
			>
				<div class="flex-1 min-w-0 ds-timeline-entry-row__main">
					<!-- OCC: type row only in header; title + body stacked flush; one band before footer -->
					<div
						class="ds-timeline-entry-occ-header flex flex-col gap-0 min-w-0"
						data-testid="timeline-entry-occ-header"
					>
						<div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 w-full min-w-0">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
								<span
									class="text-[11px] font-bold tracking-wide {timelineTypeOccHeadingClass(entry.type)}"
									id={`ce-timeline-entry-type-label-${entry.id}`}
									data-testid="timeline-entry-type-badge"
									title={typeBadgeTitle(entry.type) ?? 'Entry type'}
								>
									{typeHeadingUpper(entry.type)}
								</span>
								{#if tags.length > 0}
									<div
										class="flex flex-wrap gap-1 min-w-0"
										role="group"
										aria-label={TIMELINE_META_LABEL_TAGS}
										data-testid="timeline-entry-tags-block"
									>
										{#each tags as tag}
											<span
												class="text-[10px] px-1.5 py-px rounded border border-gray-200/90 dark:border-gray-600/90 text-gray-500 dark:text-gray-400 font-mono"
											>
												{tag}
											</span>
										{/each}
									</div>
								{/if}
							</div>
							<div
								class="flex items-center gap-1 shrink-0 justify-end min-w-0 max-w-[min(100%,22rem)] text-[11px] text-slate-500 dark:text-slate-400 {!hasMetadataLocation ? 'min-h-[1.25rem]' : ''}"
								data-testid="timeline-entry-location"
								title={hasMetadataLocation ? metadataLocationRaw : ''}
							>
								{#if hasMetadataLocation}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-3.5 shrink-0 opacity-90"
										aria-hidden="true"
									>
										<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
										<circle cx="12" cy="10" r="3" />
									</svg>
									<span class="truncate font-medium text-slate-600 dark:text-slate-300 text-right">
										{#each splitTextForSearchHighlight(metadataLocationRaw, searchHighlightNeedle) as locSeg, lIdx (lIdx)}
											{#if locSeg.highlight}
												<mark class="{DS_TIMELINE_CLASSES.searchMark} text-inherit">{locSeg.text}</mark>
											{:else}{locSeg.text}{/if}
										{/each}
									</span>
								{/if}
							</div>
						</div>
						<span class="sr-only" id={`ce-timeline-entry-occurred-label-${entry.id}`}>{P124_TIMELINE_LABEL_EVENT_OCCURRED}</span>
						<time
							datetime={entry.occurred_at}
							class="sr-only"
							title={P124_TIMELINE_TOOLTIP_OCCURRED_AT}
							data-testid="timeline-entry-occurred-at"
							aria-labelledby={`ce-timeline-entry-occurred-label-${entry.id}`}
						>
							{formatOperationalCaseDateTimeWithSeconds(entry.occurred_at)}
						</time>
					</div>

					<div class="ds-timeline-entry-occ-main-text flex flex-col gap-0 min-w-0">
						{#if (entry.title ?? '').trim()}
							<p
								class="w-full min-w-0 text-sm font-semibold text-[color:var(--ds-fg)] leading-snug m-0 pb-0"
								data-testid="timeline-entry-title"
							>
								{#each splitTextForSearchHighlight((entry.title ?? '').trim(), searchHighlightNeedle) as tSeg, tix (tix)}
									{#if tSeg.highlight}
										<mark class="{DS_TIMELINE_CLASSES.searchMark} text-inherit">{tSeg.text}</mark>
									{:else}{tSeg.text}{/if}
								{/each}
							</p>
						{/if}
						<div class="ds-timeline-entry-body-block min-w-0" data-testid="timeline-entry-body-block">
							<p
								bind:this={bodyEl}
								class="ds-timeline-entry-body-primary text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words"
								class:line-clamp-5={showBodyClampToggle && !bodyExpanded}
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
									class="ds-timeline-entry-body-toggle text-left text-[10px] font-medium text-gray-500 dark:text-gray-400 underline underline-offset-2"
									data-testid="timeline-entry-body-toggle"
									aria-expanded={bodyExpanded}
									on:click={() => (bodyExpanded = !bodyExpanded)}
								>
									{bodyExpanded ? 'Show less' : 'Show more'}
								</button>
							{/if}
						</div>
					</div>

						<div
							class="ds-timeline-entry-row__footer ds-timeline-entry-row__footer--occ flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1 py-0 text-[10px] text-gray-500 dark:text-gray-400 w-full min-w-0"
						>
							{#if hasMetadataCreator}
								<span
									class="inline-flex flex-wrap items-baseline gap-x-1 min-w-0 max-w-[min(100%,24rem)]"
									data-testid="timeline-entry-entered-by"
									title={`${P124_TIMELINE_TOOLTIP_CREATED_BY} ${creatorTooltipRaw}`}
								>
									<span class="sr-only">{P124_TIMELINE_LABEL_LOGGED_BY}</span>
									<span
										class="text-[10px] font-semibold uppercase tracking-wide text-gray-500/90 dark:text-gray-500"
										aria-hidden="true"
									>By</span>
									<span class="{DS_TYPE_CLASSES.mono} text-gray-600 dark:text-gray-300 truncate">{creatorDisplayLabel}</span>
								</span>
							{:else}
								<span class="min-w-0 flex-1" aria-hidden="true"></span>
							{/if}

							<div class="flex items-center gap-0.5 shrink-0 ml-auto">
								{#if manualEvidenceSelectionEnabled}
									<label
										class="inline-flex items-center shrink-0 cursor-pointer"
										title={P109_EVIDENCE_SELECTION_TIMELINE_TOGGLE_TITLE}
										data-testid="timeline-entry-manual-evidence-select"
									>
										<input
											type="checkbox"
											class="rounded border-gray-300 dark:border-gray-600 size-3.5 text-slate-600 focus:ring-slate-500"
											checked={manualEvidenceSelected}
											aria-label="Select this timeline entry for manual evidence packaging (this session only)"
											on:click|stopPropagation
											on:change|stopPropagation={onManualEvidenceSelectionToggle}
										/>
									</label>
								{/if}
								<button
									type="button"
									class="{TIMELINE_OPS_BTN} {TIMELINE_OPS_FOCUS_FLAG} {entryFlagged
										? 'text-amber-600 dark:text-amber-400 ds-timeline-entry-flag-toggle--active'
										: ''}"
									aria-pressed={entryFlagged}
									aria-label={entryFlagged ? 'Unflag entry' : 'Flag entry'}
									title={TIMELINE_OPS_TITLE_FLAG}
									data-testid="timeline-entry-flag-toggle"
									data-timeline-review-flag={entryFlagged ? '1' : '0'}
									on:click|stopPropagation={toggleEntryFlag}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-4 shrink-0"
										aria-hidden="true"
									>
										<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
										<line x1="4" x2="4" y1="22" y2="15" />
									</svg>
								</button>
								<button
									type="button"
									class="{TIMELINE_OPS_BTN} {TIMELINE_OPS_FOCUS_RELATE} {relatePendingSource
										? 'ds-timeline-entry-relate-toggle--pending'
										: ''} {relatePaired ? 'ds-timeline-entry-relate-toggle--paired' : ''}"
									aria-pressed={relateAriaPressed}
									aria-label={relateLabel}
									title={TIMELINE_OPS_TITLE_RELATE}
									data-testid="timeline-entry-relate-toggle"
									data-timeline-relate-paired={relatePaired ? '1' : '0'}
									on:click|stopPropagation={onRelateClick}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-4 shrink-0"
										aria-hidden="true"
									>
										<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
										<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
									</svg>
								</button>
								<button
									type="button"
									class="{TIMELINE_OPS_BTN} {TIMELINE_OPS_FOCUS_FOLLOWUP} {entryNeedsFollowUp
										? 'ds-timeline-entry-followup-toggle--active'
										: ''}"
									aria-pressed={entryNeedsFollowUp}
									aria-label={entryNeedsFollowUp ? 'Remove follow-up marker' : 'Mark for follow-up'}
									title={TIMELINE_OPS_TITLE_FOLLOWUP}
									data-testid="timeline-followup-toggle"
									data-timeline-followup-toggle={entryNeedsFollowUp ? '1' : '0'}
									on:click|stopPropagation={onFollowUpClick}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="size-4 shrink-0"
										aria-hidden="true"
									>
										<rect width="8" height="4" x="8" y="2" rx="1" ry="1" fill="none" />
										<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
										<path d="M9 12h6" />
										<path d="M9 16h6" />
									</svg>
								</button>
								{#if isCleaned}
									<Popover.Root bind:open={aiOriginalPopoverOpen} onOpenChange={(o) => (aiOriginalPopoverOpen = o)}>
										<Popover.Trigger
											class="{TIMELINE_OPS_BTN} ds-timeline-entry-ai-emblem !rounded-full text-violet-300 dark:text-violet-200 bg-violet-950/35 dark:bg-violet-950/50 border border-violet-400/35 dark:border-violet-400/25 shadow-[0_0_14px_rgba(167,139,250,0.4)] hover:shadow-[0_0_18px_rgba(167,139,250,0.6)] transition-shadow duration-200"
											aria-expanded={aiOriginalPopoverOpen}
											aria-label="View original timeline entry text"
											title={TIMELINE_AI_EMBLEM_TITLE}
											data-testid="timeline-entry-ai-emblem"
											type="button"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="currentColor"
												class="size-4 shrink-0 drop-shadow-[0_0_6px_rgba(196,181,253,0.85)]"
												aria-hidden="true"
											>
												<path
													d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
												/>
											</svg>
											<span class="sr-only" data-testid="timeline-entry-ai-cleaned">AI-assisted entry</span>
										</Popover.Trigger>
										<Popover.Content
											class="z-[60] w-[min(22rem,calc(100vw-2rem))] max-h-[min(70vh,28rem)] overflow-hidden flex flex-col rounded-xl border border-violet-200/80 dark:border-violet-800/60 bg-white dark:bg-gray-850 p-0 shadow-xl outline-none"
											side="top"
											sideOffset={8}
											align="end"
											collisionPadding={12}
										>
											<div
												class="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 shrink-0"
											>
												<p
													class="text-xs font-semibold tracking-wide text-violet-700 dark:text-violet-300 m-0"
													data-testid="timeline-entry-ai-original-heading"
												>
													{TIMELINE_AI_ORIGINAL_HEADING}
												</p>
											</div>
											<div
												class="overflow-y-auto px-3 py-3 text-sm leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words font-sans"
												data-testid="timeline-entry-ai-original-body"
											>
												{(entry.text_original ?? '').trim()}
											</div>
										</Popover.Content>
									</Popover.Root>
								{/if}
								{#if showProvenanceBlock && entry.provenance}
									<Popover.Root bind:open={lineagePopoverOpen} onOpenChange={(o) => (lineagePopoverOpen = o)}>
										<Popover.Trigger
											class="{TIMELINE_OPS_BTN} {TIMELINE_OPS_FOCUS_LINEAGE} ds-timeline-entry-lineage-trigger text-gray-400 dark:text-gray-500 hover:text-sky-700 dark:hover:text-sky-300"
											aria-expanded={lineagePopoverOpen}
											aria-label="Origin and lineage"
											title={TIMELINE_LINEAGE_TRIGGER_TITLE}
											data-testid="timeline-entry-lineage-trigger"
											type="button"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="size-4 shrink-0"
												aria-hidden="true"
											>
												<line x1="6" x2="6" y1="3" y2="15" />
												<circle cx="18" cy="6" r="3" />
												<circle cx="6" cy="18" r="3" />
												<path d="M18 9a9 9 0 0 1-9 9" />
											</svg>
										</Popover.Trigger>
										<Popover.Content
											class="z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 p-0 shadow-xl outline-none"
											side="top"
											sideOffset={8}
											align="end"
											collisionPadding={12}
										>
											<div
												class="p-3"
												data-testid="timeline-entry-context-origin"
											>
												<TimelineEntryProvenanceBlock
													variant="panel"
													{caseId}
													provenance={entry.provenance}
												/>
											</div>
										</Popover.Content>
									</Popover.Root>
								{/if}
								{#if linkedImageFiles.length > 0}
									<button
										type="button"
										class="ds-timeline-entry-linked-images-trigger inline-flex items-center justify-center min-h-7 min-w-7 rounded-md p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
										title="View linked images from case files"
										data-testid="timeline-entry-linked-images-trigger"
										aria-label={`${TIMELINE_CONTEXT_LABEL_LINKED_IMAGES} (${linkedImageFiles.length})`}
										on:click|stopPropagation={() => (linkedImagesViewerOpen = true)}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 16 16"
											fill="currentColor"
											class="size-4 shrink-0 opacity-90"
											aria-hidden="true"
										>
											<path
												d="M2 3a1 1 0 011-1h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm11 0H3v7.5l2.5-2.5 3 3 2-2L13 10V3zM5.5 5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
											/>
										</svg>
										<span class="sr-only">{linkedImageFiles.length} linked</span>
									</button>
								{/if}
								<DropdownMenu.Root bind:open={actionsMenuOpen} onOpenChange={(s) => (actionsMenuOpen = s)}>
									<DropdownMenu.Trigger>
										<button
											type="button"
											class="ds-timeline-entry-actions-menu-btn"
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
											on:click={onEditRequest}
											data-testid="timeline-entry-edit-button"
										>
											<Pencil className="w-4 h-4 shrink-0" />
											<span>Edit</span>
										</DropdownMenu.Item>
										<hr class="border-gray-100 dark:border-gray-800 my-1" />
										<DropdownMenu.Item
											class="ds-timeline-entry-version-history-item select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
											on:click={() => void openVersionHistoryFromMenu()}
											data-testid="timeline-entry-menu-version-history"
										>
											<ClockRotateRight className="w-4 h-4 shrink-0" />
											<span class="flex flex-col items-start gap-0 leading-tight">
												<span>Version history</span>
												<span class="text-[10px] font-normal text-gray-500 dark:text-gray-400">Now v{currentVersion}</span>
											</span>
										</DropdownMenu.Item>
										{#if showProvenanceBlock && entry.provenance}
											<DropdownMenu.Item
												class="select-none flex gap-2 items-center px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
												on:click={openLineageFromMenu}
												data-testid="timeline-entry-menu-origin-lineage"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
													class="w-4 h-4 shrink-0"
													aria-hidden="true"
												>
													<line x1="6" x2="6" y1="3" y2="15" />
													<circle cx="18" cy="6" r="3" />
													<circle cx="6" cy="18" r="3" />
													<path d="M18 9a9 9 0 0 1-9 9" />
												</svg>
												<span>Origin &amp; lineage</span>
											</DropdownMenu.Item>
										{/if}
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
				class="ds-timeline-entry-history-panel"
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
										Event occurred (then):
										<span class="font-mono">{formatOperationalCaseDateTimeWithSeconds(ver.prior_occurred_at)}</span>
									</p>
								{/if}
								{#if ver.prior_type !== entry.type}
									<p class="text-[10px] text-gray-400 dark:text-gray-500">
										Type (then): {typeLabel(ver.prior_type)}
									</p>
								{/if}
								{#if (ver.prior_title ?? '').trim() !== ''}
									<p class="text-[10px] text-gray-400 dark:text-gray-500">
										Title (then): {(ver.prior_title ?? '').trim()}
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
		</div>

		<TimelineEntryLinkedImagesViewer
			show={linkedImagesViewerOpen}
			{token}
			files={linkedImageFiles}
			onClose={() => (linkedImagesViewerOpen = false)}
		/>
	</svelte:element>
{/if}
