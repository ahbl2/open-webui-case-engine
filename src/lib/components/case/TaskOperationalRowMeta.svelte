<!--
  P91-05: Shared read-only block for Phase 91 operational fields on task rows.
  P91-06: Tooltips reinforce scanning/awareness only — not Timeline authority, workflow, or SLA.
  Order: assignee → due date → priority → group label (muted secondary lines).
-->
<script lang="ts">
	import type { CaseEngineAssignableUser } from '$lib/apis/caseEngine/caseTasksApi';
	import type { CaseTask } from '$lib/case/caseTaskModel';
	import {
		caseTaskOperationalAssigneeLine,
		caseTaskOperationalDueLineParts,
		caseTaskOperationalGroupLine,
		caseTaskOperationalPriorityLine
	} from '$lib/case/caseTaskModel';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let task: CaseTask;
	export let assignableUsers: CaseEngineAssignableUser[];

	$: assigneeLine = caseTaskOperationalAssigneeLine(task, assignableUsers);
	$: dueParts = caseTaskOperationalDueLineParts(task);
	$: priorityLine = caseTaskOperationalPriorityLine(task);
	$: groupLine = caseTaskOperationalGroupLine(task);
</script>

<div class="flex flex-col gap-0.5" data-testid="case-tasks-row-operational-meta" data-task-id={task.id}>
	{#if assigneeLine}
		<p
			class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
			data-testid="case-tasks-assignee-line"
			data-task-id={task.id}
			title="Operational assignment — not workflow routing."
		>
			{assigneeLine}
		</p>
	{/if}
	{#if dueParts}
		<p
			class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
			data-testid="case-tasks-due-line"
			data-task-id={task.id}
			data-due-overdue={dueParts.overdue ? 'true' : 'false'}
			title="Due date uses your device’s local calendar. Awareness only—not scheduling, SLA, or required action."
		>
			{dueParts.label}
			{#if dueParts.overdue}
				<span class="italic opacity-90"> (past due)</span>
			{/if}
		</p>
	{/if}
	{#if priorityLine}
		<p
			class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
			data-testid="case-tasks-priority-line"
			data-task-id={task.id}
			title="Operator-set priority for scanning only—not workflow or SLA."
		>
			{priorityLine}
		</p>
	{/if}
	{#if groupLine}
		<p
			class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
			data-testid="case-tasks-group-label-line"
			data-task-id={task.id}
			title="Organizational label for scanning only—not process stage, approval routing, or committed Timeline authority."
		>
			{groupLine}
		</p>
	{/if}
</div>
