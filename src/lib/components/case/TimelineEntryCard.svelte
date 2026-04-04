<script lang="ts">
	/**
	 * TimelineEntryCard — P28-31 Truth Visibility Pass, P28-33 Version History Indicator,
	 *                     P28-34 Edit Surface, P28-35 Soft-Delete + Restore UI,
	 *                     P28-38 Usability Polish Pass
	 *                     P38-08 — type “note” vs Notes tab (labels/tooltips only)
	 *                     P39-02A — optional search match highlight (normalized needle from parent)
	 *
	 * Truth signals (P28-31):
	 *   1. AI-cleaned transparency — badge + show/hide original toggle
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
	 *   - Active entries show compact Remove + Edit buttons in footer
	 *   - Deleted entries (entry.deleted_at set) render a compact removed-state view
	 *   - onRestoreRequest (ADMIN only) shown for deleted entries
	 */
	import type { TimelineEntry, TimelineEntryVersion } from '$lib/apis/caseEngine';
	import { listTimelineEntryVersions } from '$lib/apis/caseEngine';
	import {
		TIMELINE_TYPE_NOTE_DISPLAY_LABEL,
		TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP
	} from '$lib/caseTimeline/timelineTypeNoteClarity';
	import { splitTextForSearchHighlight } from '$lib/caseTimeline/timelineSearchUx';
	import { formatCaseDateTimeWithSeconds, formatCaseDateTime } from '$lib/utils/formatDateTime';

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

	const TYPE_COLORS: Record<string, string> = {
		note:         'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
		surveillance: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
		interview:    'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
		evidence:     'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
	};

	function typeLabel(type: string): string {
		return TYPE_LABELS[type] ?? type;
	}

	function typeColor(type: string): string {
		return TYPE_COLORS[type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
	}

	function typeBadgeTitle(type: string): string | undefined {
		return type === 'note' ? TIMELINE_TYPE_NOTE_VS_NOTES_TAB_TOOLTIP : undefined;
	}

	function parseTags(raw: string | string[] | null | undefined): string[] {
		if (!raw) return [];
		if (Array.isArray(raw)) return raw;
		try { return JSON.parse(raw); } catch { return []; }
	}

	$: tags = parseTags(entry.tags);
	$: isDeleted = !!entry.deleted_at;

	// ── AI-cleaned text toggle (P28-31) ────────────────────────────────────────
	let showOriginal = false;
	$: isCleaned = typeof entry.text_cleaned === 'string' && entry.text_cleaned.trim() !== '';
	$: displayText = isCleaned && !showOriginal
		? entry.text_cleaned!.trim()
		: (entry.text_original ?? '').trim();

	$: bodyHighlightSegments = splitTextForSearchHighlight(displayText, searchHighlightNeedle);

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

	async function toggleHistory(): Promise<void> {
		if (!isEdited) return;
		if (historyExpanded) { historyExpanded = false; return; }
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

	function sameTimestamp(a: string, b: string): boolean {
		try { return new Date(a).getTime() === new Date(b).getTime(); } catch { return a === b; }
	}
</script>

{#if isDeleted}
	<!-- ── Compact removed-state card (P28-35) ────────────────────────────────── -->
	<li
		class="flex flex-col gap-1.5 rounded-lg border border-dashed
		       border-red-200 dark:border-red-900/50
		       bg-red-50/20 dark:bg-gray-900
		       px-4 py-3 opacity-80"
		data-testid="timeline-entry-deleted"
		data-entry-id={entry.id}
	>
		<!-- Meta row: type + time + Removed badge + Restore -->
		<div class="flex items-center gap-2 flex-wrap">
			<span
				class="text-xs font-medium px-1.5 py-0.5 rounded opacity-50 {typeColor(entry.type)}"
				title={typeBadgeTitle(entry.type)}
			>
				{typeLabel(entry.type)}
			</span>
			<time
				datetime={entry.occurred_at}
				class="text-xs font-mono text-gray-400 dark:text-gray-600"
			>
				{formatCaseDateTimeWithSeconds(entry.occurred_at)}
			</time>
			<span
				class="text-[10px] font-medium px-1 py-0.5 rounded
				       bg-red-50 dark:bg-red-900/20
				       text-red-500 dark:text-red-400"
				title="This entry has been removed from the active timeline. An ADMIN can restore it."
				data-testid="timeline-entry-removed-badge"
			>
				Removed from timeline
			</span>

		<!-- Restore button — only when onRestoreRequest is provided (ADMIN) -->
		{#if onRestoreRequest}
			<button
				type="button"
				class="ml-auto text-xs font-medium px-2 py-0.5 rounded
				       bg-green-50 dark:bg-green-900/20
				       text-green-600 dark:text-green-400
				       hover:bg-green-100 dark:hover:bg-green-900/40
				       transition"
				on:click={onRestoreRequest}
				title="Restore this entry to the active timeline"
				data-testid="timeline-entry-restore-button"
			>
				Restore
			</button>
		{/if}
		</div>

		<!-- Entry text — truncated and subdued; enough to identify the entry -->
		<p
			class="text-xs text-gray-400 dark:text-gray-600 line-clamp-2 leading-relaxed"
			data-testid="timeline-entry-deleted-text"
		>
			{#each splitTextForSearchHighlight(entry.text_original ?? '', searchHighlightNeedle) as seg, hIdx (hIdx)}
				{#if seg.highlight}
					<mark
						class="timeline-search-match bg-amber-100/40 dark:bg-amber-900/20 rounded px-0.5 text-inherit"
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
	</li>

{:else}
	<!-- ── Active entry card ─────────────────────────────────────────────────── -->
	<li
		class="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700
		       bg-white dark:bg-gray-900 px-4 py-3 shadow-sm"
		data-testid="timeline-entry"
		data-entry-id={entry.id}
	>
		<!-- ── Meta row: type · occurred_at (with seconds) · edited · location ── -->
		<div class="flex items-center gap-2 flex-wrap">
			<!-- Type badge -->
			<span
				class="text-xs font-medium px-1.5 py-0.5 rounded {typeColor(entry.type)}"
				title={typeBadgeTitle(entry.type)}
			>
				{typeLabel(entry.type)}
			</span>

		<!-- occurred_at — seconds included for sub-minute sequence clarity -->
		<time
			datetime={entry.occurred_at}
			class="text-xs font-mono text-gray-600 dark:text-gray-300"
			title="When this occurred"
		>
			{formatCaseDateTimeWithSeconds(entry.occurred_at)}
		</time>

			<!-- Edited badge — interactive button when version_count > 0 (P28-33) -->
			{#if isEdited}
				<button
					type="button"
					class="inline-flex items-center gap-0.5 text-[10px] font-medium px-1 py-0.5 rounded
					       bg-amber-50 dark:bg-amber-900/20
					       text-amber-600 dark:text-amber-400
					       hover:bg-amber-100 dark:hover:bg-amber-900/40
					       cursor-pointer transition"
					title={historyExpanded ? 'Collapse version history' : 'Expand version history'}
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
								class="timeline-search-match bg-amber-100/40 dark:bg-amber-900/20 rounded px-0.5 text-inherit"
							>{locSeg.text}</mark>
						{:else}{locSeg.text}{/if}
					{/each}
				</span>
			{/if}
		</div>

		<!-- ── AI-cleaned indicator + toggle ────────────────────────────────────── -->
		{#if isCleaned}
			<div class="flex items-center gap-2">
				<span
					class="text-[10px] font-medium px-1 py-0.5 rounded
					       bg-violet-50 dark:bg-violet-900/20
					       text-violet-600 dark:text-violet-400"
					title="The displayed text has been processed by AI. Use the toggle to see the verbatim original."
					data-testid="timeline-entry-ai-cleaned"
				>
					AI-cleaned
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
			class="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed"
			data-testid="timeline-entry-body"
		>
			{#each bodyHighlightSegments as seg, bIdx (bIdx)}
				{#if seg.highlight}
					<mark
						class="timeline-search-match bg-amber-100 text-gray-900 dark:bg-amber-900/55 dark:text-amber-100 rounded px-0.5"
					>{seg.text}</mark>
				{:else}{seg.text}{/if}
			{/each}
		</p>

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
	<div class="flex items-center gap-2 flex-wrap pt-1.5 border-t border-gray-100 dark:border-gray-800 mt-0.5">
		<span class="text-xs text-gray-400 dark:text-gray-500">
			Recorded
			<time datetime={entry.created_at} class="font-mono">
				{formatCaseDateTime(entry.created_at)}
			</time>
			by <span class="font-medium text-gray-500 dark:text-gray-400">{entry.created_by}</span>
		</span>

		{#if isRetrospective}
			<span
				class="text-[10px] font-medium px-1 py-0.5 rounded
				       border border-gray-300 dark:border-gray-600
				       text-gray-500 dark:text-gray-400"
				title="This entry was logged significantly after the event it describes."
				data-testid="timeline-entry-delayed-logging"
			>
				Logged later
			</span>
			<span
				class="text-[10px] font-medium px-1 py-0.5 rounded
				       bg-gray-100 dark:bg-gray-800
				       text-gray-500 dark:text-gray-400"
				title="This entry was recorded approximately {retrospectiveHours} hours after the event it describes."
				data-testid="timeline-entry-retrospective"
			>
				Logged {retrospectiveHours}h after
			</span>
		{/if}

		<!-- Action buttons: Remove · Edit (right-aligned, subtle) -->
		<div class="ml-auto flex items-center gap-1">
			<button
				type="button"
				class="text-xs text-gray-400 dark:text-gray-500
				       hover:text-red-600 dark:hover:text-red-400
				       px-1.5 py-0.5 rounded
				       hover:bg-red-50 dark:hover:bg-red-900/20
				       transition"
				on:click={onDeleteRequest}
				title="Remove this timeline entry (soft delete — can be restored by ADMIN)"
				data-testid="timeline-entry-delete-button"
			>
				Remove
			</button>
			<button
				type="button"
				class="text-xs text-gray-400 dark:text-gray-500
				       hover:text-amber-700 dark:hover:text-amber-400
				       px-1.5 py-0.5 rounded
				       hover:bg-amber-50 dark:hover:bg-amber-900/20
				       transition"
				on:click={onEditRequest}
				title="Edit this timeline entry"
				data-testid="timeline-entry-edit-button"
			>
				Edit
			</button>
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
										<span class="font-mono">{formatCaseDateTimeWithSeconds(ver.prior_occurred_at)}</span>
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
										AI-cleaned version also existed at this state.
									</p>
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		{/if}
	</li>
{/if}
