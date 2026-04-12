<script lang="ts">
	/**
	 * P98-02 / P98-05 — Read-only declared relationship strip for Timeline entries (contract-driven only).
	 * P98-04 — Same-case navigation for available targets only (Phase 97 history-state pattern).
	 */
	import { goto } from '$app/navigation';
	import type { TimelineEntry } from '$lib/apis/caseEngine';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		navigateFromDeclaredRelationshipRow,
		p98DeclaredRelationshipNavigateAriaLabel
	} from '$lib/case/p98DeclaredRelationshipNavigation';
	import {
		P98_DECLARED_RELATIONSHIP_REGION_ARIA,
		type P98DeclaredRelationshipRow
	} from '$lib/case/p98DeclaredRelationshipPresentation';
	import { timelineEntryDeclaredRelationshipsPresentation } from '$lib/case/timelineP98DeclaredRelationships';

	export let caseId: string;
	export let entry: TimelineEntry;

	$: p = timelineEntryDeclaredRelationshipsPresentation(caseId, entry);

	async function onNavigateRow(row: P98DeclaredRelationshipRow): Promise<void> {
		await navigateFromDeclaredRelationshipRow(goto, caseId, row, { kind: 'timeline_entry', id: entry.id });
	}
</script>

{#if p.show}
	<div
		class="ds-timeline-entry-p98-declared mt-1.5 pt-1.5 border-t border-gray-100/90 dark:border-gray-800/80"
		data-testid="timeline-entry-p98-declared-relationships"
		aria-label={P98_DECLARED_RELATIONSHIP_REGION_ARIA}
	>
		<p class="ds-timeline-entry-meta-label {DS_TYPE_CLASSES.meta} mb-0.5 text-[10px]">{p.heading}</p>
		<ul
			class="mt-0.5 space-y-0.5 list-none pl-0"
			data-testid="timeline-entry-p98-declared-relationship-list"
		>
			{#each p.rows as row (row.relationship_key)}
				<li
					class="text-[10px] text-gray-500 dark:text-gray-400 font-mono leading-snug"
					data-testid="timeline-entry-p98-declared-relationship-row"
					data-relationship-key={row.relationship_key}
					data-p98-navigable={row.navigable ? '1' : '0'}
				>
					{#if row.navigable}
						<button
							type="button"
							class="text-left underline underline-offset-2 decoration-gray-400/80 hover:decoration-gray-600 dark:hover:decoration-gray-300 bg-transparent p-0 border-0 cursor-pointer font-mono text-inherit"
							data-testid="timeline-entry-p98-declared-navigate"
							aria-label={p98DeclaredRelationshipNavigateAriaLabel(row)}
							on:click={() => void onNavigateRow(row)}
						>
							{row.primaryLine}
						</button>
					{:else}
						<span data-testid="timeline-entry-p98-declared-primary">{row.primaryLine}</span>
					{/if}
					{#if row.availabilityNote}
						<span
							class="text-gray-400 dark:text-gray-500 ml-1"
							data-testid="timeline-entry-p98-declared-unavailable"
						>
							— {row.availabilityNote}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="mt-1 text-[9px] text-gray-400 dark:text-gray-500 leading-tight">{p.footnote}</p>
	</div>
{/if}
