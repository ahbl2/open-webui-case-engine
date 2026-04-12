<!--
  P94-03: Compact inline presence for same-case note/file cross-refs (counts only).
  Navigation remains in expanded detail / CaseTaskCrossRefsSection — not interaction here.
-->
<script lang="ts">
	import type { CaseTask } from '$lib/case/caseTaskModel';
	import { caseTaskCrossRefCounts } from '$lib/case/caseTaskModel';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let task: CaseTask;

	$: counts = caseTaskCrossRefCounts(task);
	$: show = counts.notes > 0 || counts.files > 0;
</script>

{#if show}
	<div
		class="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 {DS_TYPE_CLASSES.meta} text-xs text-[color:var(--ce-l-text-muted)] break-words [overflow-wrap:anywhere]"
		data-testid="case-tasks-row-context-signals"
		data-task-id={task.id}
		data-context-note-count={counts.notes}
		data-context-file-count={counts.files}
	>
		{#if counts.notes > 0}
			<span data-testid="case-tasks-context-notes-label">Notes ({counts.notes})</span>
		{/if}
		{#if counts.notes > 0 && counts.files > 0}
			<span class="text-[color:var(--ce-l-text-muted)] select-none" aria-hidden="true">·</span>
		{/if}
		{#if counts.files > 0}
			<span data-testid="case-tasks-context-files-label">Files ({counts.files})</span>
		{/if}
	</div>
{/if}
