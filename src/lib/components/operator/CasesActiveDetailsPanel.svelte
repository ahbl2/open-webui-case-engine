<script lang="ts">
	import { ChevronDownIcon } from 'heroicons-svelte/24/solid';

	import { listCaseTimelineEntriesPage, type CaseEngineCase, type TimelineEntry } from '$lib/apis/caseEngine';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_OCC_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import { stripLeadingDateTimePrefix } from '$lib/utils/timelineEntryText';

	export let tokenPresent: boolean;
	/** Required to load timeline rows (same JWT as Case Engine). */
	export let caseEngineToken: string | null = null;
	export let caseData: CaseEngineCase | null;
	export let emptyMessage: string;
	export let onOpenCase: () => void;
	export let onRefreshList: () => void;

	let menuOpen = false;
	let summaryOpen = true;

	function unitBadgeClass(unit: string): string {
		if (unit === 'CID') return DS_BADGE_CLASSES.unitCid;
		if (unit === 'SIU') return DS_BADGE_CLASSES.unitSiu;
		return DS_BADGE_CLASSES.neutral;
	}

	function statusBadgeClass(status: string): string {
		return status === 'OPEN' ? DS_BADGE_CLASSES.warning : DS_BADGE_CLASSES.neutral;
	}

	function formatDisplayDate(k: CaseEngineCase): string {
		const raw = k.incident_date;
		if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
			const [y, m, d] = raw.split('-').map(Number);
			const dt = new Date(y, m - 1, d);
			return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		}
		const r = k as Record<string, unknown>;
		const cr = r.created_at;
		if (typeof cr === 'string' && cr.length) {
			const t = Date.parse(cr);
			if (!Number.isNaN(t))
				return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
		}
		return '—';
	}

	/** Optional case fields (snake_case) — populated when Case Engine exposes them on `GET /cases`. */
	function pickCaseString(c: CaseEngineCase, keys: string[]): string | undefined {
		const r = c as Record<string, unknown>;
		for (const k of keys) {
			const v = r[k];
			if (typeof v === 'string' && v.trim()) return v.trim();
		}
		return undefined;
	}

	function victimLine(c: CaseEngineCase): string | undefined {
		return pickCaseString(c, ['victim_name', 'primary_victim_name', 'victim']);
	}

	function suspectLine(c: CaseEngineCase): string | undefined {
		return pickCaseString(c, ['main_suspect', 'primary_suspect_name', 'suspect_name', 'suspect']);
	}

	function locationLine(c: CaseEngineCase): string | undefined {
		const u = String(c.unit ?? '').toUpperCase();
		if (u === 'CID') {
			return pickCaseString(c, ['incident_location', 'incident_location_text', 'scene_location']);
		}
		if (u === 'SIU') {
			return pickCaseString(c, ['main_location', 'primary_location', 'main_location_text']);
		}
		return pickCaseString(c, ['incident_location', 'main_location', 'location']);
	}

	function locationLabel(c: CaseEngineCase): string {
		const u = String(c.unit ?? '').toUpperCase();
		if (u === 'CID') return 'Incident location';
		if (u === 'SIU') return 'Main location';
		return 'Location';
	}

	function sortNewestFirst(entries: TimelineEntry[]): TimelineEntry[] {
		return [...entries].sort((a, b) => {
			const dt = new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime();
			if (dt !== 0) return dt;
			return b.id.localeCompare(a.id);
		});
	}

	function entryPreview(e: TimelineEntry): string {
		const raw = (e.text_cleaned && e.text_cleaned.trim()) || e.text_original || '';
		const oneLine = raw.replace(/\s+/g, ' ').trim();
		if (!oneLine) return '(No text)';
		const body = stripLeadingDateTimePrefix(oneLine);
		const display = body.length ? body : oneLine;
		if (display.length <= 140) return display;
		return `${display.slice(0, 137)}…`;
	}

	function formatEntryType(t: string): string {
		if (!t?.trim()) return 'Entry';
		return t.replace(/_/g, ' ');
	}

	function formatOccurredShort(iso: string): string {
		const t = Date.parse(iso);
		if (Number.isNaN(t)) return '—';
		return new Date(t).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	let recentTimeline: TimelineEntry[] = [];
	let timelineLoading = false;
	let timelineError = '';
	let timelineRequestId = 0;

	async function loadRecentTimeline(caseId: string, authToken: string) {
		const req = ++timelineRequestId;
		timelineLoading = true;
		timelineError = '';
		recentTimeline = [];
		try {
			const first = await listCaseTimelineEntriesPage(caseId, authToken, { limit: 5, offset: 0 });
			if (req !== timelineRequestId) return;
			if (first.total === 0) return;
			let rows: TimelineEntry[];
			if (first.total <= 5) {
				rows = sortNewestFirst(first.entries);
			} else {
				const last = await listCaseTimelineEntriesPage(caseId, authToken, {
					limit: 5,
					offset: first.total - 5
				});
				if (req !== timelineRequestId) return;
				rows = sortNewestFirst(last.entries);
			}
			recentTimeline = rows;
		} catch (e) {
			if (req !== timelineRequestId) return;
			timelineError = (e as Error).message ?? 'Failed to load timeline';
			recentTimeline = [];
		} finally {
			if (req === timelineRequestId) timelineLoading = false;
		}
	}

	function clickAway(e: MouseEvent) {
		if (!(e.target as HTMLElement).closest?.('[data-cases-more-menu]')) menuOpen = false;
	}

	$: railVictim = caseData ? victimLine(caseData) : undefined;
	$: railSuspect = caseData ? suspectLine(caseData) : undefined;
	$: railLoc = caseData ? locationLine(caseData) : undefined;
	$: railLocLabel = caseData ? locationLabel(caseData) : 'Location';

	/** Only refetch when selection or auth changes — not when the case object is replaced with same id. */
	$: selectedCaseId = caseData?.id ?? null;
	$: authTokenForTimeline = caseEngineToken ?? null;

	$: if (selectedCaseId && authTokenForTimeline) {
		void loadRecentTimeline(selectedCaseId, authTokenForTimeline);
	} else {
		timelineRequestId++;
		recentTimeline = [];
		timelineLoading = false;
		timelineError = '';
	}

	function refreshListAndTimeline() {
		if (caseData?.id && caseEngineToken) void loadRecentTimeline(caseData.id, caseEngineToken);
		onRefreshList();
	}
</script>

<svelte:window on:click={(e) => menuOpen && clickAway(e)} />

<div class="{DS_OCC_CLASSES.mainSection} flex min-h-0 min-w-0 flex-1 flex-col">
	<div class="{DS_OCC_CLASSES.sectionHeaderRow} items-start gap-2">
		<div class={DS_OCC_CLASSES.sectionHeaderTitle}>
			<h3 class="{DS_TYPE_CLASSES.section} m-0">Active case details</h3>
		</div>
		<div class="relative shrink-0 ms-auto" data-cases-more-menu>
			<button
				type="button"
				class="{DS_BTN_CLASSES.ghost} inline-flex items-center gap-1 text-sm py-1 px-2"
				aria-expanded={menuOpen}
				aria-haspopup="menu"
				on:click|stopPropagation={() => (menuOpen = !menuOpen)}
			>
				More
				<ChevronDownIcon class="size-4 opacity-80" aria-hidden="true" />
			</button>
			{#if menuOpen}
				<ul
					class="absolute right-0 top-full z-20 mt-1 min-w-[12rem] rounded-md border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-elevated)] py-1 text-sm shadow-lg"
					role="menu"
				>
					<li role="none">
						<button type="button" class="block w-full text-left px-3 py-2 hover:bg-[color:var(--ds-bg-muted)]" role="menuitem" on:click={() => { onOpenCase(); menuOpen = false; }}>
							Open workspace
						</button>
					</li>
					<li role="none">
						<button
							type="button"
							class="block w-full text-left px-3 py-2 hover:bg-[color:var(--ds-bg-muted)]"
							role="menuitem"
							on:click={() => {
								refreshListAndTimeline();
								menuOpen = false;
							}}
						>
							Refresh list
						</button>
					</li>
				</ul>
			{/if}
		</div>
	</div>
	<div class="{DS_OCC_CLASSES.boardCardBody} flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
		{#if !tokenPresent}
			<p class="{DS_TYPE_CLASSES.meta} m-0">{emptyMessage}</p>
		{:else if !caseData}
			<p class="{DS_TYPE_CLASSES.meta} m-0">{emptyMessage}</p>
		{:else}
			<div>
				<p class="{DS_TYPE_CLASSES.mono} text-sm mb-1">{caseData.case_number}</p>
				<p class="{DS_TYPE_CLASSES.panel} m-0 mb-2 line-clamp-2">{caseData.title ?? '(untitled)'}</p>
				<div class="flex flex-wrap items-center gap-2 mb-1">
					<span class={unitBadgeClass(caseData.unit)}>{caseData.unit}</span>
					<span class={statusBadgeClass(caseData.status)}>
						{caseData.status === 'OPEN' ? 'ACTIVE' : caseData.status}
					</span>
					<span class="{DS_TYPE_CLASSES.meta}">{formatDisplayDate(caseData)}</span>
				</div>
			</div>

			<div class="rounded-[var(--ds-radius-md)] border border-[color:var(--ds-border-default)] bg-[color:var(--ds-bg-muted)]/35 p-3">
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 text-left"
					on:click={() => (summaryOpen = !summaryOpen)}
					aria-expanded={summaryOpen}
				>
					<span class="{DS_TYPE_CLASSES.section} text-sm m-0">Case summary & key risks</span>
					<span
						class="{DS_BADGE_CLASSES.info} text-[0.65rem] uppercase tracking-wide"
					>AI-ready</span>
				</button>
				{#if summaryOpen}
					<p class="{DS_TYPE_CLASSES.meta} mt-2 mb-0 leading-relaxed">
						High-level read of <span class="text-[color:var(--ds-text-secondary)]">{caseData.title ?? 'this case'}</span>.
						Open the workspace for governed narratives, evidence links, and timeline verification. Risk markers
						appear after notes and intel are attached.
					</p>
				{/if}
			</div>

			<div>
				<h4 class="{DS_TYPE_CLASSES.section} text-sm m-0 mb-2">Parties & location</h4>
				<dl class="flex flex-col gap-3 m-0">
					{#if railVictim}
						<div>
							<dt class="{DS_TYPE_CLASSES.meta} text-[0.65rem] uppercase tracking-wide text-[color:var(--ds-text-muted)] m-0">
								Victim
							</dt>
							<dd class="{DS_TYPE_CLASSES.panel} text-sm m-0 mt-0.5 leading-snug">{railVictim}</dd>
						</div>
					{/if}
					<div>
						<dt class="{DS_TYPE_CLASSES.meta} text-[0.65rem] uppercase tracking-wide text-[color:var(--ds-text-muted)] m-0">
							Main suspect
						</dt>
						<dd class="{DS_TYPE_CLASSES.panel} text-sm m-0 mt-0.5 leading-snug">
							{railSuspect ?? 'Unknown'}
						</dd>
					</div>
					<div>
						<dt class="{DS_TYPE_CLASSES.meta} text-[0.65rem] uppercase tracking-wide text-[color:var(--ds-text-muted)] m-0">
							{railLocLabel}
						</dt>
						<dd class="{DS_TYPE_CLASSES.panel} text-sm m-0 mt-0.5 leading-snug">
							{railLoc ?? '—'}
						</dd>
					</div>
				</dl>
			</div>

			<div>
				<h4 class="{DS_TYPE_CLASSES.section} text-sm m-0 mb-2">Recent Timeline</h4>
				{#if timelineLoading}
					<p class="{DS_TYPE_CLASSES.meta} m-0 text-sm">Loading timeline…</p>
				{:else if timelineError}
					<p class="{DS_TYPE_CLASSES.meta} m-0 text-sm text-[color:var(--ds-text-muted)]">{timelineError}</p>
				{:else if recentTimeline.length === 0}
					<p class="{DS_TYPE_CLASSES.meta} m-0 text-sm">No timeline entries yet.</p>
				{:else}
					<ul class="flex flex-col gap-2.5 list-none m-0 p-0">
						{#each recentTimeline as entry, i (entry.id)}
							<li class="flex gap-2 text-sm">
								<span class="shrink-0 text-[color:var(--ds-accent)] pt-0.5" aria-hidden="true"
									>{['◆', '◇', '○'][i % 3]}</span
								>
								<div class="min-w-0 flex-1">
									<div class="{DS_TYPE_CLASSES.panel} leading-snug break-words">{entryPreview(entry)}</div>
									<div class="{DS_TYPE_CLASSES.meta} text-xs mt-0.5">
										{formatEntryType(entry.type)} · {formatOccurredShort(entry.occurred_at)}
										{#if entry.location_text?.trim()}
											<span class="text-[color:var(--ds-text-muted)]">
												· {entry.location_text.trim()}</span
											>
										{/if}
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>
</div>
