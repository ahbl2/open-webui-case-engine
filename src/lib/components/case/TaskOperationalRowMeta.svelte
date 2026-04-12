<!--
  P91-05: Shared read-only block for Phase 91 operational fields on task rows.
  P91-06: Tooltips reinforce scanning/awareness only — not Timeline authority, workflow, or SLA.
  P93-03: Scan cues (overdue emphasis + priority dots) — render-time only; no data mutation.
  P94-02: Deterministic order assignee → due → group → priority; labeled lines; overflow-safe wrapping.
  Overdue: CASE_TASK_SCAN_SR_OVERDUE (sr-only) + CASE_TASK_SCAN_VISIBLE_PAST_DUE (sighted, aria-hidden); no duplicate aria-label on the due line.
  Overdue styling is independent of priority (no dot required). Keep cues minimal for dense lists.
  P92-03: Optional compact density — tighter spacing and single-line clamp per field (presentation only).
-->
<script lang="ts">
	import type { CaseEngineAssignableUser } from '$lib/apis/caseEngine/caseTasksApi';
	import type { CaseTask, CaseTaskScanSection, TaskDensityMode } from '$lib/case/caseTaskModel';
	import {
		CASE_TASK_SCAN_SR_OVERDUE,
		CASE_TASK_SCAN_VISIBLE_PAST_DUE,
		caseTaskOperationalAssigneeLine,
		caseTaskOperationalDueLineParts,
		caseTaskOperationalGroupLine,
		caseTaskOperationalPriorityLine,
		caseTaskScanOverdueCue,
		caseTaskScanPriorityCueLevel
	} from '$lib/case/caseTaskModel';
	import { DS_TYPE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

	export let task: CaseTask;
	export let assignableUsers: CaseEngineAssignableUser[];
	/** P93-03: `active` = open section; `inactive` = completed / archived / soft-deleted (suppress overdue urgency). */
	export let scanSection: CaseTaskScanSection = 'active';
	export let density: TaskDensityMode = 'expanded';

	$: assigneeLine = caseTaskOperationalAssigneeLine(task, assignableUsers);
	$: dueParts = caseTaskOperationalDueLineParts(task);
	$: priorityLine = caseTaskOperationalPriorityLine(task);
	$: groupLine = caseTaskOperationalGroupLine(task);
	$: overdueCue = caseTaskScanOverdueCue(task, scanSection);
	$: priorityCue = caseTaskScanPriorityCueLevel(task);
	$: showPastDueHint = Boolean(dueParts?.overdue && scanSection === 'active');
	$: priorityDotMuted = scanSection === 'inactive';

	const metaLineClass =
		'min-w-0 break-words [overflow-wrap:anywhere] [word-break:normal]';

	function priorityCueClasses(level: NonNullable<typeof priorityCue>): string {
		// Not workflow signaling — distinct chroma only; paired with text "Priority: …" (not color-only).
		switch (level) {
			case 'high':
				return 'bg-amber-500 dark:bg-amber-400';
			case 'medium':
				return 'bg-sky-500 dark:bg-sky-400';
			case 'low':
				return 'bg-gray-400 dark:bg-gray-500';
		}
	}
</script>

<div
	class="flex min-w-0 flex-col {density === 'compact' ? 'gap-0' : 'gap-0.5'} task-operational-meta {density === 'compact'
		? 'task-operational-meta--compact'
		: 'task-operational-meta--expanded'}"
	data-testid="case-tasks-row-operational-meta"
	data-task-id={task.id}
	data-density={density}
	data-scan-section={scanSection}
	data-case-task-meta-order="assignee_due_group_priority"
>
	{#if assigneeLine}
		<p
			class="{DS_TYPE_CLASSES.meta} {metaLineClass} m-0 text-[color:var(--ce-l-text-muted)] {density === 'compact'
				? 'text-[10px] leading-tight line-clamp-1'
				: 'text-xs'}"
			data-testid="case-tasks-assignee-line"
			data-task-id={task.id}
			data-case-task-meta-slot="assignee"
			title="Operational assignment — not workflow routing."
		>
			{assigneeLine}
		</p>
	{/if}
	{#if dueParts}
		<p
			class="{DS_TYPE_CLASSES.meta} {metaLineClass} m-0 {density === 'compact'
				? 'text-[10px] leading-tight line-clamp-1'
				: 'text-xs'} {overdueCue
				? 'font-semibold text-amber-900 dark:text-amber-100 border-l-2 border-amber-500/50 pl-2 -ml-0.5 rounded-sm'
				: 'text-[color:var(--ce-l-text-muted)]'}"
			data-testid="case-tasks-due-line"
			data-task-id={task.id}
			data-case-task-meta-slot="due"
			data-due-overdue={dueParts.overdue ? 'true' : 'false'}
			data-case-task-scan-overdue={overdueCue ? 'true' : 'false'}
			title="Due date uses your device’s local calendar. Awareness only—not scheduling, SLA, or required action."
		>
			{#if overdueCue}
				<span class="sr-only">{CASE_TASK_SCAN_SR_OVERDUE}</span>
				<span class="inline-flex align-middle mr-1 text-amber-700 dark:text-amber-300" aria-hidden="true">
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block shrink-0 translate-y-px">
						<circle cx="12" cy="12" r="10" />
						<path d="M12 6v6l4 2" />
					</svg>
				</span>
			{/if}
			{dueParts.label}
			{#if showPastDueHint}
				<span class="font-normal italic opacity-90" aria-hidden="true">{CASE_TASK_SCAN_VISIBLE_PAST_DUE}</span>
			{/if}
		</p>
	{/if}
	{#if groupLine}
		<p
			class="{DS_TYPE_CLASSES.meta} {metaLineClass} m-0 text-[color:var(--ce-l-text-muted)] {density === 'compact'
				? 'text-[10px] leading-tight line-clamp-1'
				: 'text-xs'}"
			data-testid="case-tasks-group-label-line"
			data-task-id={task.id}
			data-case-task-meta-slot="group"
			title="Organizational label for scanning only—not process stage, approval routing, or committed Timeline authority."
		>
			{groupLine}
		</p>
	{/if}
	{#if priorityLine && priorityCue}
		<p
			class="{DS_TYPE_CLASSES.meta} {metaLineClass} m-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[color:var(--ce-l-text-muted)] {density === 'compact'
				? 'text-[10px] leading-tight line-clamp-1'
				: 'text-xs'}"
			data-testid="case-tasks-priority-line"
			data-task-id={task.id}
			data-case-task-meta-slot="priority"
			data-case-task-priority-cue={priorityCue}
			title="Operator-set priority for scanning only—not workflow or SLA."
		>
			<span
				class="inline-block size-1.5 shrink-0 rounded-full translate-y-px {priorityCueClasses(
					priorityCue
				)} {priorityDotMuted ? 'opacity-55' : ''}"
				aria-hidden="true"
			/>
			<span class="min-w-0">{priorityLine}</span>
		</p>
	{:else if priorityLine}
		<p
			class="{DS_TYPE_CLASSES.meta} {metaLineClass} m-0 text-[color:var(--ce-l-text-muted)] {density === 'compact'
				? 'text-[10px] leading-tight line-clamp-1'
				: 'text-xs'}"
			data-testid="case-tasks-priority-line"
			data-task-id={task.id}
			data-case-task-meta-slot="priority"
			data-case-task-priority-cue="none"
			title="Operator-set priority for scanning only—not workflow or SLA."
		>
			{priorityLine}
		</p>
	{/if}
</div>
