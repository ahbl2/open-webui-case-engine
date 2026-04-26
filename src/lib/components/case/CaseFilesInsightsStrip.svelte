<!--
	Bottom strip: mockup-aligned “AI-powered insights” — server aggregates + tag heuristics from the loaded list.
-->
<script lang="ts">
	import type { CaseFile, CaseFilesInsights } from '$lib/apis/caseEngine';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import { formatCaseDateTime } from '$lib/utils/formatDateTime';

	export let files: CaseFile[] = [];
	export let caseInsights: CaseFilesInsights | null = null;
	export let caseInsightsLoading = false;

	function ms(iso: string): number {
		const t = Date.parse(iso);
		return Number.isFinite(t) ? t : 0;
	}

	$: recent24hInList = files.filter((f) => {
		const u = f.uploaded_at;
		if (typeof u !== 'string') return false;
		return Date.now() - ms(u) < 24 * 60 * 60 * 1000;
	}).length;

	$: newest = files.length
		? files.reduce((a, b) => (ms(String(a.uploaded_at ?? '')) >= ms(String(b.uploaded_at ?? '')) ? a : b))
		: null;

	$: topTags = (() => {
		const m = new Map<string, number>();
		for (const f of files) {
			for (const t of f.tags ?? []) {
				const k = t.trim();
				if (!k) continue;
				m.set(k, (m.get(k) ?? 0) + 1);
			}
		}
		return [...m.entries()]
			.map(([tag, count]) => ({ tag, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);
	})();

	$: mostTagged = files.length
		? [...files].sort(
				(a, b) => (b.tags?.length ?? 0) - (a.tags?.length ?? 0) || a.original_filename.localeCompare(b.original_filename)
			)[0]
		: null;

	$: showStrip =
		files.length > 0 ||
		caseInsightsLoading ||
		(caseInsights != null &&
			(caseInsights.most_timeline_linked_file != null ||
				caseInsights.distinct_timeline_linked_files > 0 ||
				caseInsights.uploads_last_24h > 0));
</script>

{#if showStrip}
	<div class="mt-4 shrink-0 border-t border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-raised)] px-3 py-3" data-testid="case-files-insights-strip">
		<p class="m-0 mb-3 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
			AI-powered insights · this case
		</p>
		<div class="grid gap-2 sm:grid-cols-3">
			<div class="min-w-0 rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] px-2.5 py-2">
				<p class="m-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
					Most linked on Timeline
				</p>
				{#if caseInsightsLoading}
					<p class="m-0 mt-1 text-sm text-[color:var(--ce-l-text-muted)]">Loading…</p>
				{:else if caseInsights?.most_timeline_linked_file}
					<p
						class="m-0 mt-1 truncate text-sm font-medium text-[color:var(--ce-l-text-primary)]"
						title={caseInsights.most_timeline_linked_file.original_filename}
					>
						{caseInsights.most_timeline_linked_file.original_filename}
					</p>
					<p class="m-0 text-[11px] text-[color:var(--ce-l-text-muted)] {DS_TYPE_CLASSES.meta}">
						{caseInsights.most_timeline_linked_file.timeline_link_count} timeline link{caseInsights
							.most_timeline_linked_file.timeline_link_count === 1
							? ''
							: 's'} · {caseInsights.distinct_timeline_linked_files} file{caseInsights.distinct_timeline_linked_files ===
						1
							? ''
							: 's'} with links
					</p>
				{:else if mostTagged}
					<p
						class="m-0 mt-1 truncate text-sm font-medium text-[color:var(--ce-l-text-primary)]"
						title={mostTagged.original_filename}
					>
						{mostTagged.original_filename}
					</p>
					<p class="m-0 text-[11px] text-[color:var(--ce-l-text-muted)] {DS_TYPE_CLASSES.meta}">
						{#if caseInsights != null}
							Most tagged in this list (no timeline links yet)
						{:else}
							By tag count in this filtered list (heuristic)
						{/if}
					</p>
				{:else}
					<p class="m-0 mt-1 text-sm text-[color:var(--ce-l-text-muted)]">—</p>
				{/if}
			</div>
			<div class="min-w-0 rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] px-2.5 py-2">
				<p class="m-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
					Key topics (tags)
				</p>
				{#if topTags.length > 0}
					<ul class="m-0 mt-1 list-none space-y-0.5 p-0 text-xs text-[color:var(--ce-l-text-primary)]">
						{#each topTags as row (row.tag)}
							<li class="flex justify-between gap-2">
								<span class="min-w-0 truncate">{row.tag}</span>
								<span class="shrink-0 tabular-nums text-[color:var(--ce-l-text-muted)]">{row.count}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="m-0 mt-1 text-sm text-[color:var(--ce-l-text-muted)]">No tags in this list</p>
				{/if}
			</div>
			<div class="min-w-0 rounded-md border border-[color:var(--ce-l-border-subtle)] bg-[color:var(--ce-l-surface-elevated)] px-2.5 py-2">
				<p class="m-0 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ce-l-text-muted)]">
					Recent upload activity
				</p>
				{#if caseInsightsLoading}
					<p class="m-0 mt-1 text-sm font-semibold text-[color:var(--ce-l-text-primary)]">Loading…</p>
					<p class="m-0 text-[11px] text-[color:var(--ce-l-text-muted)]">Case-wide uploads (24h)</p>
				{:else if caseInsights != null}
					<p class="m-0 mt-1 text-sm font-semibold text-[color:var(--ce-l-text-primary)]">
						{caseInsights.uploads_last_24h}
					</p>
					<p class="m-0 text-[11px] text-[color:var(--ce-l-text-muted)]">
						Uploads in last 24h (case-wide){#if files.length > 0}
							· {recent24hInList} in this list{/if}
					</p>
					{#if newest}
						<p class="m-0 mt-2 truncate text-[11px] text-[color:var(--ce-l-text-muted)]" title={newest.original_filename}>
							Latest in list: {formatCaseDateTime(String(newest.uploaded_at ?? ''))}
						</p>
					{/if}
				{:else}
					<p class="m-0 mt-1 text-sm font-semibold text-[color:var(--ce-l-text-primary)]">{recent24hInList}</p>
					<p class="m-0 text-[11px] text-[color:var(--ce-l-text-muted)]">Uploads in last 24h (this list)</p>
					{#if newest}
						<p class="m-0 mt-2 truncate text-[11px] text-[color:var(--ce-l-text-muted)]" title={newest.original_filename}>
							Latest: {formatCaseDateTime(String(newest.uploaded_at ?? ''))}
						</p>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
