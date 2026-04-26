<!--
	KPI row for Files tab — same cell treatment as Case overview summary (ds-occ-kpi-card + overview tile stack).
-->
<script lang="ts">
	import type { CaseFilesAggregateStats } from '$lib/apis/caseEngine';
	import { DS_STATUS_TEXT_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import {
		DocumentDuplicateIcon,
		ArrowPathIcon,
		ClockIcon,
		LinkIcon,
		FlagIcon
	} from 'heroicons-svelte/24/outline';

	export let stats: CaseFilesAggregateStats | null = null;
	export let loading = false;

	const tileBase = 'ds-occ-kpi-card ds-case-overview-kpi-tile h-full min-w-0';

	const loadingPlaceholders: Array<{
		mod: string;
		label: string;
		Icon: typeof DocumentDuplicateIcon;
	}> = [
		{ mod: 'ds-occ-kpi-card--blue', label: 'Total', Icon: DocumentDuplicateIcon },
		{ mod: 'ds-occ-kpi-card--green', label: 'Indexed', Icon: ArrowPathIcon },
		{ mod: 'ds-occ-kpi-card--amber', label: 'Pending', Icon: ClockIcon },
		{ mod: 'ds-occ-kpi-card--teal', label: 'Linked', Icon: LinkIcon },
		{ mod: 'ds-occ-kpi-card--rose', label: 'Flagged', Icon: FlagIcon }
	];

	function fmtGb(bytes: number): string {
		if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
		const gb = bytes / (1024 * 1024 * 1024);
		if (gb >= 0.1) return `${gb.toFixed(1)} GB`;
		const mb = bytes / (1024 * 1024);
		return `${mb.toFixed(1)} MB`;
	}
</script>

<div
	class="w-full min-w-0 shrink-0 border-b border-[color:var(--ce-l-border-default)] bg-[color:var(--ce-l-surface-elevated)] px-4 pb-3 pt-2.5"
	data-testid="case-files-kpi-strip"
>
	{#if loading}
		<div
			class="grid w-full grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-2"
			aria-busy="true"
		>
			{#each loadingPlaceholders as row (row.label)}
				<div class="{tileBase} {row.mod}">
					<div class="ds-case-overview-kpi-tile__head">
						<div class="ds-occ-kpi-card__label min-w-0 flex-1">{row.label}</div>
						<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
							<svelte:component this={row.Icon} />
						</div>
					</div>
					<div class="ds-case-overview-kpi-tile__stack flex-1 justify-center" role="status">
						<p class="ds-occ-kpi-card__metric ds-occ-kpi-card__metric--muted">—</p>
						<p class="ds-occ-kpi-card__support ds-occ-kpi-card__support--loading">
							<span class="inline-flex items-center gap-2">
								<span class={DS_STATUS_TEXT_CLASSES.info}><Spinner className="size-4" /></span>
								Loading…
							</span>
						</p>
					</div>
				</div>
			{/each}
		</div>
	{:else if !stats}
		<p class="m-0 text-xs text-[color:var(--ce-l-text-muted)]">Metrics unavailable.</p>
	{:else}
		<div class="grid w-full grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-2">
			<!-- Total — blue -->
			<div class="{tileBase} ds-occ-kpi-card--blue">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Total</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<DocumentDuplicateIcon />
					</div>
				</div>
				<div class="ds-case-overview-kpi-tile__stack flex-1">
					<p class="ds-occ-kpi-card__metric" data-metric="files-kpi-total">{stats.total_files}</p>
					<p class="ds-occ-kpi-card__support">{fmtGb(stats.total_bytes)} · evidence storage</p>
				</div>
			</div>

			<!-- Indexed — green -->
			<div class="{tileBase} ds-occ-kpi-card--green">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Indexed</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<ArrowPathIcon />
					</div>
				</div>
				<div class="ds-case-overview-kpi-tile__stack flex-1">
					<p class="ds-occ-kpi-card__metric" data-metric="files-kpi-indexed">{stats.extracted_file_count}</p>
					<p class="ds-occ-kpi-card__support">Text extracted</p>
				</div>
			</div>

			<!-- Pending — amber -->
			<div class="{tileBase} ds-occ-kpi-card--amber">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Pending</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<ClockIcon />
					</div>
				</div>
				<div class="ds-case-overview-kpi-tile__stack flex-1">
					<p class="ds-occ-kpi-card__metric" data-metric="files-kpi-pending">{stats.pending_processing_count}</p>
					<p class="ds-occ-kpi-card__support">In queue</p>
				</div>
			</div>

			<!-- Linked — teal -->
			<div class="{tileBase} ds-occ-kpi-card--teal">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Linked to entities</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<LinkIcon />
					</div>
				</div>
				<div class="ds-case-overview-kpi-tile__stack flex-1">
					<p class="ds-occ-kpi-card__metric" data-metric="files-kpi-linked">
						{stats.linked_to_timeline_count < 0 ? '—' : stats.linked_to_timeline_count}
					</p>
					<p class="ds-occ-kpi-card__support">Timeline &amp; intelligence</p>
				</div>
			</div>

			<!-- Flagged — rose -->
			<div class="{tileBase} ds-occ-kpi-card--rose">
				<div class="ds-case-overview-kpi-tile__head">
					<div class="ds-occ-kpi-card__label min-w-0 flex-1">Flagged</div>
					<div class="ds-case-overview-kpi-tile__icon" aria-hidden="true">
						<FlagIcon />
					</div>
				</div>
				<div class="ds-case-overview-kpi-tile__stack flex-1">
					<p class="ds-occ-kpi-card__metric" data-metric="files-kpi-flagged">{stats.flagged_file_count ?? 0}</p>
					<p class="ds-occ-kpi-card__support">Needs review</p>
				</div>
			</div>
		</div>
	{/if}
</div>
