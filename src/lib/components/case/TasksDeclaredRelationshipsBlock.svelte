<script lang="ts">
	/**
	 * P98-03 / P98-05 — Read-only declared relationship strip for operational tasks (P98-01 contract only).
	 * P98-04 — Same-case navigation for available targets (Phase 97 history-state + notes `?note=`).
	 */
	import { goto } from '$app/navigation';
	import type { CaseTask } from '$lib/case/caseTaskModel';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
	import {
		navigateFromDeclaredRelationshipRow,
		p98DeclaredRelationshipNavigateAriaLabel
	} from '$lib/case/p98DeclaredRelationshipNavigation';
	import {
		P98_DECLARED_RELATIONSHIP_REGION_ARIA,
		type P98DeclaredRelationshipRow
	} from '$lib/case/p98DeclaredRelationshipPresentation';
	import { taskDeclaredRelationshipsPresentation } from '$lib/case/tasksP98DeclaredRelationships';

	export let caseId: string;
	export let task: CaseTask;

	$: p = taskDeclaredRelationshipsPresentation(caseId, task);

	async function onNavigateRow(row: P98DeclaredRelationshipRow): Promise<void> {
		await navigateFromDeclaredRelationshipRow(goto, caseId, row, { kind: 'case_task', id: task.id });
	}
</script>

{#if p.show}
	<div
		class="ds-case-tasks-p98-declared mt-2 pt-2 border-t border-dashed border-[color:var(--ce-l-chrome-border)]"
		data-testid="case-tasks-p98-declared-relationships"
		aria-label={P98_DECLARED_RELATIONSHIP_REGION_ARIA}
	>
		<p class="ds-timeline-entry-meta-label {DS_TYPE_CLASSES.meta} mb-0.5 text-[10px]">{p.heading}</p>
		<ul
			class="mt-0.5 space-y-0.5 list-none pl-0"
			data-testid="case-tasks-p98-declared-relationship-list"
		>
			{#each p.rows as row (row.relationship_key)}
				<li
					class="text-[10px] text-gray-500 dark:text-gray-400 font-mono leading-snug"
					data-testid="case-tasks-p98-declared-relationship-row"
					data-relationship-key={row.relationship_key}
					data-p98-navigable={row.navigable ? '1' : '0'}
				>
					{#if row.navigable}
						<button
							type="button"
							class="text-left underline underline-offset-2 decoration-gray-400/80 hover:decoration-gray-600 dark:hover:decoration-gray-300 bg-transparent p-0 border-0 cursor-pointer font-mono text-inherit"
							data-testid="case-tasks-p98-declared-navigate"
							aria-label={p98DeclaredRelationshipNavigateAriaLabel(row)}
							on:click={() => void onNavigateRow(row)}
						>
							{row.primaryLine}
						</button>
					{:else}
						<span data-testid="case-tasks-p98-declared-primary">{row.primaryLine}</span>
					{/if}
					{#if row.availabilityNote}
						<span
							class="text-gray-400 dark:text-gray-500 ml-1"
							data-testid="case-tasks-p98-declared-unavailable"
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
