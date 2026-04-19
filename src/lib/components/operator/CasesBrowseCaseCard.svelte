<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import {
		ArchiveBoxIcon,
		DocumentTextIcon,
		FolderIcon as FolderOutlineIcon,
		MapPinIcon,
		UserGroupIcon
	} from 'heroicons-svelte/24/outline';
	import { FolderIcon } from 'heroicons-svelte/24/solid';

	import type { CaseEngineCase } from '$lib/apis/caseEngine';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_CASE_BROWSE_CLASSES,
		DS_TYPE_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';

	/** Selected row shows action strip + summary (mock “expanded” cell). */
	export let selected = false;
	export let c: CaseEngineCase;
	export let assigneeLabel: string;
	export let assigneeInitials: string;

	function unitBadgeClass(unit: string): string {
		if (unit === 'CID') return DS_BADGE_CLASSES.unitCid;
		if (unit === 'SIU') return DS_BADGE_CLASSES.unitSiu;
		return DS_BADGE_CLASSES.neutral;
	}

	function statusBadgeClass(status: string): string {
		return status === 'OPEN' ? DS_BADGE_CLASSES.success : DS_BADGE_CLASSES.neutral;
	}

	function statusDisplay(status: string): string {
		return status === 'OPEN' ? 'ACTIVE' : status;
	}

	function priorityBadgeClass(status: string): string {
		return status === 'CLOSED' ? DS_BADGE_CLASSES.neutral : DS_BADGE_CLASSES.warning;
	}

	function priorityLabel(status: string): string {
		return status === 'CLOSED' ? 'LOW' : 'STD';
	}

	function rawUpdatedAt(k: CaseEngineCase): string | undefined {
		const r = k as Record<string, unknown>;
		const u = r.updated_at;
		if (typeof u === 'string' && u.length > 0) return u;
		const cr = r.created_at;
		if (typeof cr === 'string' && cr.length > 0) return cr;
		return undefined;
	}

	function formatRelativeShort(iso: string | undefined): string {
		if (!iso) return '—';
		const t = Date.parse(iso);
		if (Number.isNaN(t)) return '—';
		const diffSec = Math.round((Date.now() - t) / 1000);
		const abs = Math.abs(diffSec);
		const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
		if (abs < 60) return rtf.format(-diffSec, 'second');
		if (abs < 3600) return rtf.format(-Math.round(diffSec / 60), 'minute');
		if (abs < 86400) return rtf.format(-Math.round(diffSec / 3600), 'hour');
		if (abs < 86400 * 7) return rtf.format(-Math.round(diffSec / 86400), 'day');
		if (abs < 86400 * 30) return rtf.format(-Math.round(diffSec / (86400 * 7)), 'week');
		if (abs < 86400 * 365) return rtf.format(-Math.round(diffSec / (86400 * 30)), 'month');
		return rtf.format(-Math.round(diffSec / (86400 * 365)), 'year');
	}

	/** Mock-style KPI strip: illustrative counts derived from id until the API exposes aggregates. */
	function statCount(seed: string, salt: number): string {
		let h = 2166136261;
		for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
		const n = ((h >>> 0) + salt * 2654435761) % 220;
		return String(100 + n).padStart(3, '0');
	}

	function summarySnippet(k: CaseEngineCase): string {
		const title = (k.title ?? '').trim() || '(untitled)';
		const inc = k.incident_date ? ` Incident date ${k.incident_date}.` : '';
		return `${title}.${inc} Open the workspace for full case files, notes, and timeline entries.`.trim();
	}

	function onCardKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			dispatchSelect();
		}
	}

	const dispatch = createEventDispatcher<{
		select: { id: string };
		open: { case: CaseEngineCase };
		edit: { case: CaseEngineCase };
		gotoNotes: { case: CaseEngineCase };
		gotoFiles: { case: CaseEngineCase };
		gotoTimeline: { case: CaseEngineCase };
	}>();

	function dispatchSelect() {
		dispatch('select', { id: c.id });
	}
</script>

<article
	class="{DS_CASE_BROWSE_CLASSES.root} {selected ? DS_CASE_BROWSE_CLASSES.rootSelected : ''}"
	data-testid="cases-browse-card"
	data-case-id={c.id}
	role="button"
	tabindex="0"
	aria-pressed={selected}
	on:click={dispatchSelect}
	on:keydown={onCardKeydown}
>
	<div class={DS_CASE_BROWSE_CLASSES.topRow}>
		<div class={DS_CASE_BROWSE_CLASSES.topLeft}>
			<div class={DS_CASE_BROWSE_CLASSES.caseIdRow}>
				<span class="{DS_CASE_BROWSE_CLASSES.caseId} {DS_TYPE_CLASSES.mono}">{c.case_number}</span>
				<span class={unitBadgeClass(c.unit)}>{c.unit}</span>
			</div>
			<h3 class="{DS_CASE_BROWSE_CLASSES.title} {DS_TYPE_CLASSES.panel}">{c.title ?? '(untitled)'}</h3>
		</div>
		<div class={DS_CASE_BROWSE_CLASSES.topRight}>
			<span class="{DS_CASE_BROWSE_CLASSES.updated} {DS_TYPE_CLASSES.meta}" title="Last updated">
				<span class="opacity-80">Updated</span>
				{formatRelativeShort(rawUpdatedAt(c))}
			</span>
			<span class={priorityBadgeClass(c.status)}>{priorityLabel(c.status)}</span>
			<span class={statusBadgeClass(c.status)}>{statusDisplay(c.status)}</span>
		</div>
	</div>

	<div class={DS_CASE_BROWSE_CLASSES.metaRow}>
		<div
			class={DS_CASE_BROWSE_CLASSES.stats}
			aria-hidden="true"
			title="Illustrative counts for layout; full metrics live in the case workspace."
		>
			<span class={DS_CASE_BROWSE_CLASSES.stat}
				><DocumentTextIcon class="size-4 shrink-0 opacity-85" />{statCount(c.id, 1)}</span
			>
			<span class={DS_CASE_BROWSE_CLASSES.stat}
				><UserGroupIcon class="size-4 shrink-0 opacity-85" />{statCount(c.id, 2)}</span
			>
			<span class={DS_CASE_BROWSE_CLASSES.stat}
				><MapPinIcon class="size-4 shrink-0 opacity-85" />{statCount(c.id, 3)}</span
			>
			<span class={DS_CASE_BROWSE_CLASSES.stat}
				><FolderOutlineIcon class="size-4 shrink-0 opacity-85" />{statCount(c.id, 4)}</span
			>
			<span class={DS_CASE_BROWSE_CLASSES.stat}
				><ArchiveBoxIcon class="size-4 shrink-0 opacity-85" />{statCount(c.id, 5)}</span
			>
		</div>
		{#if !selected}
			<div class={DS_CASE_BROWSE_CLASSES.assignee} title="Assignee">
				<span class={DS_CASE_BROWSE_CLASSES.avatar} aria-hidden="true">{assigneeInitials}</span>
				<span class={DS_CASE_BROWSE_CLASSES.assigneeText}>
					<span class="{DS_TYPE_CLASSES.meta} opacity-80">Lead</span>
					<span class="{DS_TYPE_CLASSES.panel} text-sm font-medium leading-tight">{assigneeLabel}</span>
				</span>
			</div>
		{/if}
	</div>

	{#if selected}
		<div class={DS_CASE_BROWSE_CLASSES.actions}>
			<div class={DS_CASE_BROWSE_CLASSES.actionsPrimary}>
				<button
					type="button"
					class="{DS_BTN_CLASSES.primary} {DS_CASE_BROWSE_CLASSES.actionBtn}"
					on:click|stopPropagation={() => dispatch('open', { case: c })}
				>
					<FolderIcon class="size-4 shrink-0 opacity-95" aria-hidden="true" />
					Open case
				</button>
				<button
					type="button"
					class="{DS_BTN_CLASSES.secondary} {DS_CASE_BROWSE_CLASSES.actionBtn}"
					on:click|stopPropagation={() => dispatch('gotoNotes', { case: c })}
				>
					Add note
				</button>
				<button
					type="button"
					class="{DS_BTN_CLASSES.secondary} {DS_CASE_BROWSE_CLASSES.actionBtn}"
					on:click|stopPropagation={() => dispatch('gotoFiles', { case: c })}
				>
					Upload file
				</button>
				<button
					type="button"
					class="{DS_BTN_CLASSES.secondary} {DS_CASE_BROWSE_CLASSES.actionBtn}"
					on:click|stopPropagation={() => dispatch('gotoTimeline', { case: c })}
				>
					Add timeline
				</button>
			</div>
			<div class={DS_CASE_BROWSE_CLASSES.leadCluster}>
				<div class={DS_CASE_BROWSE_CLASSES.assignee} title="Lead investigator">
					<span class={DS_CASE_BROWSE_CLASSES.avatar} aria-hidden="true">{assigneeInitials}</span>
					<span class={DS_CASE_BROWSE_CLASSES.assigneeText}>
						<span class="{DS_TYPE_CLASSES.meta} opacity-80">Lead</span>
						<span class="{DS_TYPE_CLASSES.panel} text-sm font-medium leading-tight">{assigneeLabel}</span>
					</span>
				</div>
				<button
					type="button"
					class="{DS_BTN_CLASSES.ghost} text-sm py-1 px-2 min-h-0"
					on:click|stopPropagation={() => dispatch('edit', { case: c })}
				>
					Edit
				</button>
			</div>
		</div>
		<p class="{DS_CASE_BROWSE_CLASSES.summary} {DS_TYPE_CLASSES.meta}">{summarySnippet(c)}</p>
	{/if}
</article>
