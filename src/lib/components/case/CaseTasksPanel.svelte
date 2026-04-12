<script lang="ts">
	/**
	 * P86 / P87 — Tasks shell (operational, not Timeline).
	 * P87-05 — Cross-surface read-layer hints (operational vs Timeline).
	 * P89-07 — Persisted Case Engine Tasks: list/create/PATCH/lifecycle/delete/restore; reconcile from server.
	 * P90-01 — Client-side status + text filters on loaded list (render-only).
	 * P90-02 — Client-side sort by task created time (operational; not Timeline).
	 * P90-03 — Expand/collapse row details (display-only; scannable collapsed summary).
	 * P90-04 — Lifecycle attribution (completed_by / archived_by; display-only).
	 * P90-05 — Optional read-only soft-deleted rows (include_deleted list; separate section).
	 * P90-06 — UX copy: Tasks = operational only vs Timeline (no behavior changes).
	 * P91-05 — Panel coherence: unified operational field order and shared row meta block.
	 * P91-06 — Guardrails: canonical Tasks-vs-Timeline copy; no Timeline logging/promotion affordances; sort = scanning only.
	 */
	import { tick } from 'svelte';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { caseEngineToken } from '$lib/stores';
	import * as caseTasksApi from '$lib/apis/caseEngine/caseTasksApi';
	import type { CaseEngineAssignableUser } from '$lib/apis/caseEngine/caseTasksApi';
	import type { CaseTask, CaseTaskListSortMode, CaseTaskStatusFilter } from '$lib/case/caseTaskModel';
	import {
		applyCaseTaskFilters,
		caseEngineTaskToCaseTask,
		caseTaskShouldOfferDetailToggle,
		CASE_TASK_GROUP_LABEL_MAX,
		CASE_TASK_PRIORITY_VALUES,
		formatCaseTaskArchiveAttribution,
		formatCaseTaskCompletionAttribution,
		formatCaseTaskPriorityLabel,
		formatCaseTaskSoftDeleteAttribution,
		replaceTaskInList,
		sortCaseTasksForList,
		sortCaseTasksByDeletedAtDesc
	} from '$lib/case/caseTaskModel';
	import {
		DS_BADGE_CLASSES,
		DS_BTN_CLASSES,
		DS_CASE_TASKS_CLASSES,
		DS_PANEL_CLASSES,
		DS_TYPE_CLASSES,
		DS_WORKFLOW_CLASSES,
		DS_WORKFLOW_TEXT_CLASSES
	} from '$lib/case/detectivePrimitiveFoundation';
	import TaskOperationalRowMeta from './TaskOperationalRowMeta.svelte';

	/** P91-06: "View in Timeline" navigates to an existing linked entry only; does not create or alter Timeline from this task. */
	const VIEW_LINKED_TIMELINE_ENTRY_TITLE =
		'Open the linked official Timeline entry (navigation only). Does not log or promote this task.';

	let tasks: CaseTask[] = [];
	let listLoading = false;
	let listError: string | null = null;
	let actionError: string | null = null;
	let isCreating = false;
	let newTaskTitle = '';
	let newTaskDescription = '';
	let newLinkedTimelineEntryId = '';
	let titleInputEl: HTMLInputElement | null = null;

	let editingTaskId: string | null = null;
	let editTitle = '';
	let editDescription = '';
	let editLinkedId = '';
	/** P91-01: legacy `users.id` or empty = unassigned */
	let editAssigneeUserId = '';
	let newAssigneeUserId = '';
	/** P91-02: HTML date input value (YYYY-MM-DD) or empty */
	let newTaskDueDate = '';
	let editDueDate = '';
	/** P91-03: `low` | `medium` | `high` or '' = none */
	let newTaskPriority = '';
	let editPriority = '';
	/** P91-04: optional grouping label (plain text) */
	let newTaskGroupLabel = '';
	let editGroupLabel = '';
	let assignableUsers: CaseEngineAssignableUser[] = [];

	let lastDeletedTaskId: string | null = null;
	let mutationBusy = false;

	/** P90-01: render-only filters; not persisted; does not replace `tasks`. */
	let statusFilter: CaseTaskStatusFilter = 'all';
	let textFilter = '';
	/** P90-02 / P91-02: default matches API list order (`created_at DESC`) or optional due-date sort. */
	let listSortMode: CaseTaskListSortMode = 'created_newest';

	/** P90-03: which task ids show expanded detail (display-only; cleared on case/token change). */
	let expandedTaskIds: Set<string> = new Set();

	/** P90-05: when true, list fetch includes soft-deleted rows (read-only section). */
	let showDeleted = false;

	let prevLoadKey = '';

	$: caseId = typeof $page.params.id === 'string' ? $page.params.id : '';
	$: ceToken = $caseEngineToken;

	$: activeTasks = tasks.filter((t) => !t.deletedAt);
	$: filteredTasks = applyCaseTaskFilters(activeTasks, { statusFilter, textQuery: textFilter });
	$: sortedFilteredTasks = sortCaseTasksForList(filteredTasks, listSortMode);
	$: deletedTasksRaw = tasks.filter((t) => Boolean(t.deletedAt));
	$: deletedTasksFiltered = applyCaseTaskFilters(deletedTasksRaw, {
		statusFilter: 'all',
		textQuery: textFilter
	});
	$: deletedTasksSorted =
		listSortMode === 'group_label_a_z' || listSortMode === 'group_label_z_a'
			? sortCaseTasksForList(deletedTasksFiltered, listSortMode)
			: sortCaseTasksByDeletedAtDesc(deletedTasksFiltered);
	$: openTasks = sortedFilteredTasks.filter((t) => t.status === 'open');
	$: completedTasks = sortedFilteredTasks.filter((t) => t.status === 'completed');
	$: archivedTasks = sortedFilteredTasks.filter((t) => t.status === 'archived');
	$: showOpenSection = statusFilter === 'all' || statusFilter === 'open';
	$: showCompletedSection = statusFilter === 'all' || statusFilter === 'completed';
	$: showArchivedSection = statusFilter === 'all' || statusFilter === 'archived';

	$: {
		const key = `${caseId}|${ceToken ?? ''}`;
		if (!caseId || !ceToken) {
			tasks = [];
			prevLoadKey = '';
			statusFilter = 'all';
			textFilter = '';
			listSortMode = 'created_newest';
			expandedTaskIds = new Set();
			showDeleted = false;
			assignableUsers = [];
		} else if (key !== prevLoadKey) {
			prevLoadKey = key;
			statusFilter = 'all';
			textFilter = '';
			listSortMode = 'created_newest';
			expandedTaskIds = new Set();
			showDeleted = false;
			assignableUsers = [];
			void loadTasks();
		}
	}

	function toggleTaskExpanded(taskId: string): void {
		const next = new Set(expandedTaskIds);
		if (next.has(taskId)) next.delete(taskId);
		else next.add(taskId);
		expandedTaskIds = next;
	}

	function clearActionError(): void {
		actionError = null;
	}

	async function loadTasks(): Promise<void> {
		const tok = get(caseEngineToken);
		if (!caseId || !tok) return;
		listLoading = true;
		listError = null;
		try {
			const [rows, users] = await Promise.all([
				caseTasksApi.listCaseTasks(caseId, tok, { includeDeleted: showDeleted }),
				caseTasksApi.listCaseAssignableUsers(caseId, tok).catch(() => [] as CaseEngineAssignableUser[])
			]);
			tasks = rows.map(caseEngineTaskToCaseTask);
			assignableUsers = users;
		} catch (e) {
			listError = e instanceof Error ? e.message : 'Failed to load tasks';
			tasks = [];
			assignableUsers = [];
		} finally {
			listLoading = false;
		}
	}

	function formatCreatedAt(iso: string): string {
		try {
			return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
		} catch {
			return iso;
		}
	}

	async function openCreate(): Promise<void> {
		clearActionError();
		isCreating = true;
		await tick();
		titleInputEl?.focus();
	}

	function cancelCreate(): void {
		newTaskTitle = '';
		newTaskDescription = '';
		newLinkedTimelineEntryId = '';
		newAssigneeUserId = '';
		newTaskDueDate = '';
		newTaskPriority = '';
		newTaskGroupLabel = '';
		isCreating = false;
	}

	async function submitCreate(): Promise<void> {
		const tok = get(caseEngineToken);
		if (!caseId || !tok) {
			actionError = 'Case Engine session not available.';
			return;
		}
		const title = newTaskTitle.trim();
		if (!title) return;
		clearActionError();
		const description = newTaskDescription.trim();
		const linked = newLinkedTimelineEntryId.trim();
		mutationBusy = true;
		try {
			const row = await caseTasksApi.createCaseTask(caseId, tok, {
				title,
				description: description.length ? description : null,
				timeline_entry_id: linked.length ? linked : null,
				assignee_user_id: newAssigneeUserId.trim() || null,
				due_date: newTaskDueDate.trim() || null,
				priority: newTaskPriority.trim() || null,
				group_label: newTaskGroupLabel.trim() || null
			});
			tasks = [caseEngineTaskToCaseTask(row), ...tasks.filter((t) => t.id !== row.id)];
			cancelCreate();
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Create failed';
		} finally {
			mutationBusy = false;
		}
	}

	function startEdit(task: CaseTask): void {
		clearActionError();
		editingTaskId = task.id;
		editTitle = task.title;
		editDescription = task.description ?? '';
		editLinkedId = task.linkedTimelineEntryId ?? '';
		editAssigneeUserId = task.assigneeUserId ?? '';
		editDueDate = task.dueDate?.trim() ?? '';
		editPriority = task.priority?.trim() ?? '';
		editGroupLabel = task.groupLabel?.trim() ?? '';
	}

	function cancelEdit(): void {
		editingTaskId = null;
		editTitle = '';
		editDescription = '';
		editLinkedId = '';
		editAssigneeUserId = '';
		editDueDate = '';
		editPriority = '';
		editGroupLabel = '';
	}

	async function saveEdit(taskId: string): Promise<void> {
		const tok = get(caseEngineToken);
		if (!caseId || !tok) {
			actionError = 'Case Engine session not available.';
			return;
		}
		clearActionError();
		const title = editTitle.trim();
		if (!title) {
			actionError = 'Title is required.';
			return;
		}
		const description = editDescription.trim();
		const linked = editLinkedId.trim();
		mutationBusy = true;
		try {
			const row = await caseTasksApi.patchCaseTaskContent(caseId, taskId, tok, {
				title,
				description: description.length ? description : null,
				timeline_entry_id: linked.length ? linked : null,
				assignee_user_id: editAssigneeUserId.trim() || null,
				due_date: editDueDate.trim() || null,
				priority: editPriority.trim() || null,
				group_label: editGroupLabel.trim() || null
			});
			tasks = replaceTaskInList(tasks, caseEngineTaskToCaseTask(row));
			cancelEdit();
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Update failed';
		} finally {
			mutationBusy = false;
		}
	}

	async function doComplete(id: string): Promise<void> {
		const tok = get(caseEngineToken);
		if (!caseId || !tok) return;
		clearActionError();
		mutationBusy = true;
		try {
			const row = await caseTasksApi.postCaseTaskComplete(caseId, id, tok);
			tasks = replaceTaskInList(tasks, caseEngineTaskToCaseTask(row));
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Complete failed';
		} finally {
			mutationBusy = false;
		}
	}

	async function doArchive(id: string): Promise<void> {
		const tok = get(caseEngineToken);
		if (!caseId || !tok) return;
		clearActionError();
		mutationBusy = true;
		try {
			const row = await caseTasksApi.postCaseTaskArchive(caseId, id, tok);
			tasks = replaceTaskInList(tasks, caseEngineTaskToCaseTask(row));
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Archive failed';
		} finally {
			mutationBusy = false;
		}
	}

	async function doReopen(id: string): Promise<void> {
		const tok = get(caseEngineToken);
		if (!caseId || !tok) return;
		clearActionError();
		mutationBusy = true;
		try {
			const row = await caseTasksApi.postCaseTaskReopen(caseId, id, tok);
			tasks = replaceTaskInList(tasks, caseEngineTaskToCaseTask(row));
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Reopen failed';
		} finally {
			mutationBusy = false;
		}
	}

	async function doDelete(id: string): Promise<void> {
		const tok = get(caseEngineToken);
		if (!caseId || !tok) return;
		clearActionError();
		mutationBusy = true;
		try {
			const row = await caseTasksApi.postCaseTaskSoftDelete(caseId, id, tok);
			const mapped = caseEngineTaskToCaseTask(row);
			if (showDeleted) {
				tasks = replaceTaskInList(tasks, mapped);
			} else {
				tasks = tasks.filter((t) => t.id !== id);
			}
			lastDeletedTaskId = id;
			if (editingTaskId === id) cancelEdit();
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Delete failed';
		} finally {
			mutationBusy = false;
		}
	}

	async function undoDelete(): Promise<void> {
		const tok = get(caseEngineToken);
		if (!caseId || !tok || !lastDeletedTaskId) return;
		clearActionError();
		mutationBusy = true;
		try {
			await caseTasksApi.postCaseTaskRestore(caseId, lastDeletedTaskId, tok);
			lastDeletedTaskId = null;
			await loadTasks();
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Restore failed';
		} finally {
			mutationBusy = false;
		}
	}

	function viewInTimeline(entryId: string): void {
		const cid = get(page).params.id;
		if (!cid || typeof cid !== 'string') return;
		void goto(`/case/${cid}/timeline?highlight=${encodeURIComponent(entryId)}`);
	}

	function onTitleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			void submitCreate();
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			cancelCreate();
		}
	}

	function onFormKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			e.preventDefault();
			cancelCreate();
		}
	}
</script>

<div class="ce-l-tasks-shell" data-testid="case-tasks-panel" data-region="case-tasks-shell">
	<header class="ce-l-tasks-hero">
		<div class="{DS_CASE_TASKS_CLASSES.pageIdentity}">
			<h2
				class="ce-l-tasks-hero-title {DS_TYPE_CLASSES.section} {DS_CASE_TASKS_CLASSES.pageIdentityHeading}"
			>
				Tasks (Operational)
			</h2>
			<span
				class="{DS_BADGE_CLASSES.neutral}"
				title="Operational tasks — not part of the official Timeline"
			>
				Non-authoritative
			</span>
		</div>
		<p
			class="{DS_CASE_TASKS_CLASSES.pageIdentityMeta} m-0 mt-0.5 w-full max-w-3xl leading-snug"
			data-testid="case-tasks-hero-eyebrow"
		>
			Work tracking for this case · Case Engine
		</p>
		<p class="ce-l-tasks-hero-descriptor {DS_TYPE_CLASSES.body} text-sm m-0 max-w-3xl leading-snug">
			Follow-up and reminders — operational only. Not the official Timeline; open Timeline for the committed
			chronological record.
		</p>
	</header>

	<div class="ce-l-tasks-workspace flex flex-col flex-1 min-h-0 min-w-0 p-3 sm:p-4">
		<div
			class="{DS_PANEL_CLASSES.muted} mb-5 shrink-0"
			data-testid="case-tasks-orientation"
			aria-label="Tasks versus Timeline"
		>
			<div class="{DS_WORKFLOW_CLASSES.doctrineBlock}">
				<p class="{DS_WORKFLOW_TEXT_CLASSES.doctrineProse} m-0">
					<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineStrong}">Tasks</span>
					— Follow-up and work tracking only. Operational — not the official Timeline and not a substitute
					for committed entries there.
				</p>
				<p class="{DS_WORKFLOW_TEXT_CLASSES.doctrineProse} m-0 mt-2">
					<span class="{DS_WORKFLOW_TEXT_CLASSES.doctrineStrong}">Timeline</span>
					— The committed official case record (ordered by occurred time).
				</p>
				<p class="{DS_WORKFLOW_TEXT_CLASSES.doctrineProse} m-0 mt-2 text-[color:var(--ce-l-text-muted)]">
					Task assignment (when used) is for operational tracking only — not ownership enforcement or workflow
					routing.
				</p>
			</div>
		</div>

		{#if !ceToken}
			<p
				class="{DS_TYPE_CLASSES.body} text-sm text-[color:var(--ce-l-text-secondary)]"
				data-testid="case-tasks-no-ce-token"
			>
				Case Engine session unavailable — tasks cannot load.
			</p>
		{:else if listLoading}
			<p class="{DS_TYPE_CLASSES.body} text-sm" data-testid="case-tasks-loading">Loading tasks…</p>
		{:else if listError}
			<p class="{DS_TYPE_CLASSES.body} text-sm text-red-600" data-testid="case-tasks-load-error">
				{listError}
			</p>
		{/if}

		{#if actionError}
			<p
				class="{DS_TYPE_CLASSES.body} text-sm text-red-600 mb-2"
				data-testid="case-tasks-action-error"
				role="alert"
			>
				{actionError}
			</p>
		{/if}

		{#if lastDeletedTaskId}
			<div
				class="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] px-3 py-2 text-sm"
				data-testid="case-tasks-delete-undo"
			>
				<span class="text-[color:var(--ce-l-text-secondary)]">Task removed from this list.</span>
				<button
					type="button"
					class="{DS_BTN_CLASSES.secondary} text-xs"
					data-testid="case-tasks-restore-undo"
					disabled={mutationBusy}
					on:click={() => void undoDelete()}
				>
					Restore task
				</button>
			</div>
		{/if}

		<div class="flex flex-wrap items-center justify-between gap-2 mb-4 shrink-0">
			<h3
				class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
				data-testid="case-tasks-workspace-section-heading"
			>
				Task list (this case)
			</h3>
			<button
				type="button"
				class="{DS_BTN_CLASSES.primary}"
				data-testid="case-tasks-add-open"
				disabled={!ceToken || mutationBusy}
				on:click={openCreate}
			>
				Add Task
			</button>
		</div>

		{#if tasks.length > 0}
			<div
				class="ce-l-tasks-filters mb-4 shrink-0 flex flex-wrap gap-3 items-end rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] px-3 py-2.5"
				data-testid="case-tasks-filters"
			>
				<label class="flex flex-col gap-1 min-w-[10rem]">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
						>Status</span
					>
					<select
						bind:value={statusFilter}
						class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
						data-testid="case-tasks-filter-status"
						aria-label="Filter tasks by lifecycle status"
					>
						<option value="all">All</option>
						<option value="open">Open</option>
						<option value="completed">Completed</option>
						<option value="archived">Archived</option>
					</select>
				</label>
				<label class="flex flex-col gap-1 flex-1 min-w-[12rem]">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
						>Filter by text</span
					>
					<input
						type="search"
						bind:value={textFilter}
						class="w-full rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
						placeholder="Match title, description, or group"
						data-testid="case-tasks-filter-text"
						autocomplete="off"
						aria-label="Filter tasks by title, description, or group label"
					/>
				</label>
				<label class="flex flex-col gap-1 min-w-[12rem]">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
						>Sort list</span
					>
					<select
						bind:value={listSortMode}
						class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)] max-w-[16rem]"
						data-testid="case-tasks-sort-created"
						aria-label="Sort tasks for scanning (operational list; not Timeline ordering)"
					>
						<optgroup label="Created">
							<option value="created_newest">Newest first</option>
							<option value="created_oldest">Oldest first</option>
						</optgroup>
						<optgroup label="Due date">
							<option value="due_soonest">Soonest</option>
							<option value="due_latest">Latest</option>
						</optgroup>
						<optgroup label="Priority">
							<option value="priority_high_first">High first</option>
							<option value="priority_low_first">Low first</option>
						</optgroup>
						<optgroup label="Group label">
							<option value="group_label_a_z">A–Z</option>
							<option value="group_label_z_a">Z–A</option>
						</optgroup>
					</select>
					<span
						class="{DS_TYPE_CLASSES.meta} text-[10px] leading-tight text-[color:var(--ce-l-text-muted)] max-w-[14rem]"
						data-testid="case-tasks-sort-created-hint"
					>
						Sort orders this list for scanning only — not scheduling, SLA, workflow, or Timeline.
					</span>
				</label>
				<div class="flex flex-col gap-1 min-w-[12rem] justify-end pb-0.5">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
						>Visibility</span
					>
					<label class="flex items-start gap-2 cursor-pointer select-none">
						<input
							type="checkbox"
							class="mt-0.5 rounded border-[color:var(--ce-l-chrome-border)]"
							checked={showDeleted}
							disabled={listLoading || mutationBusy}
							data-testid="case-tasks-show-deleted"
							aria-label="Show soft-deleted tasks read-only"
							on:change={(e) => {
								showDeleted = (e.currentTarget as HTMLInputElement).checked;
								void loadTasks();
							}}
						/>
						<span class="{DS_TYPE_CLASSES.body} text-xs text-[color:var(--ce-l-text-secondary)] leading-snug">
							Show soft-deleted (read-only, awareness only)
						</span>
					</label>
				</div>
			</div>
		{/if}

		{#if isCreating}
			<div
				class="mb-4 shrink-0 rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] p-3 flex flex-col gap-3"
				data-testid="case-tasks-create-form"
				role="group"
				aria-label="New task"
				on:keydown={onFormKeydown}
			>
				<label class="flex flex-col gap-1">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]">Title</span>
					<input
						bind:this={titleInputEl}
						bind:value={newTaskTitle}
						type="text"
						class="w-full rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
						placeholder="What needs to be done?"
						data-testid="case-tasks-create-title"
						on:keydown={onTitleKeydown}
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
						>Description (optional)</span
					>
					<textarea
						bind:value={newTaskDescription}
						rows="2"
						class="w-full rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)] resize-y min-h-[2.5rem]"
						placeholder="Details"
						data-testid="case-tasks-create-description"
					/>
				</label>
				<label class="flex flex-col gap-1">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
						>Optional link to a Timeline entry (reference only)</span
					>
					<input
						bind:value={newLinkedTimelineEntryId}
						type="text"
						class="w-full rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
						placeholder="Timeline Entry ID (reference only)"
						data-testid="case-tasks-create-link-entry-id"
						autocomplete="off"
					/>
				</label>
				<div
					class="rounded-md border border-dashed border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-3 py-2.5 flex flex-col gap-2"
					data-testid="case-tasks-operational-fields"
				>
					<p
						class="{DS_TYPE_CLASSES.meta} m-0 text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
					>
						Operational tracking (optional)
					</p>
					<label class="flex flex-col gap-1">
						<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
							>Assignee</span
						>
						<select
							bind:value={newAssigneeUserId}
							class="w-full max-w-md rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
							data-testid="case-tasks-create-assignee"
							aria-label="Optional task assignee"
						>
							<option value="">Unassigned</option>
							{#each assignableUsers as u (u.id)}
								<option value={u.id}>{u.name} ({u.role})</option>
							{/each}
						</select>
						<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
							>Tracking only — not routing.</span
						>
					</label>
					<label class="flex flex-col gap-1">
						<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]">Due date</span>
						<input
							bind:value={newTaskDueDate}
							type="date"
							class="w-full max-w-xs rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
							data-testid="case-tasks-create-due"
							autocomplete="off"
						/>
						<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
							>Awareness only — not scheduling.</span
						>
					</label>
					<label class="flex flex-col gap-1">
						<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]">Priority</span>
						<select
							bind:value={newTaskPriority}
							class="w-full max-w-xs rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
							data-testid="case-tasks-create-priority"
							aria-label="Optional task priority"
						>
							<option value="">None</option>
							{#each CASE_TASK_PRIORITY_VALUES as pv (pv)}
								<option value={pv}>{formatCaseTaskPriorityLabel(pv)}</option>
							{/each}
						</select>
						<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
							>Scanning only — not escalation.</span
						>
					</label>
					<label class="flex flex-col gap-1">
						<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
							>Group label</span
						>
						<input
							bind:value={newTaskGroupLabel}
							type="text"
							maxlength={CASE_TASK_GROUP_LABEL_MAX}
							class="w-full max-w-md rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
							placeholder="e.g. Witness follow-ups"
							data-testid="case-tasks-create-group-label"
							autocomplete="off"
							aria-label="Optional task group label"
						/>
						<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
							>List organization only — not workflow stages.</span
						>
					</label>
				</div>
				<div class="flex flex-wrap gap-2 justify-end">
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary}"
						data-testid="case-tasks-create-cancel"
						on:click={cancelCreate}
					>
						Cancel
					</button>
					<button
						type="button"
						class="{DS_BTN_CLASSES.primary}"
						data-testid="case-tasks-create-submit"
						disabled={mutationBusy}
						on:click={() => void submitCreate()}
					>
						Create Task
					</button>
				</div>
			</div>
		{/if}

		{#if tasks.length === 0 && !isCreating && ceToken && !listLoading && !listError}
			<div
				class="{DS_CASE_TASKS_CLASSES.emptyShell} flex flex-col flex-1 min-h-[12rem] items-center justify-center gap-3 text-center"
				data-testid="case-tasks-empty-state"
			>
				<p class="{DS_TYPE_CLASSES.panel} m-0 font-medium text-[color:var(--ce-l-text-primary)]">
					No tasks yet
				</p>
				<p class="{DS_TYPE_CLASSES.body} m-0 max-w-md text-sm text-[color:var(--ce-l-text-secondary)]">
					Follow-up work only — not part of the official Timeline.
				</p>
			</div>
		{/if}

		{#if activeTasks.length > 0 && filteredTasks.length === 0}
			<div
				class="{DS_CASE_TASKS_CLASSES.emptyShell} flex flex-col flex-1 min-h-[10rem] items-center justify-center gap-2 rounded-md border border-dashed border-[color:var(--ce-l-chrome-border)] px-4 py-8 text-center"
				data-testid="case-tasks-filter-empty"
			>
				<p class="{DS_TYPE_CLASSES.panel} m-0 font-medium text-[color:var(--ce-l-text-primary)]">
					No tasks match your filters
				</p>
				<p class="{DS_TYPE_CLASSES.body} m-0 max-w-md text-sm text-[color:var(--ce-l-text-secondary)]">
					Adjust status or clear the text filter. Tasks here are not Timeline entries.
				</p>
			</div>
		{:else if tasks.length > 0}
			<div
				class="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto"
				data-testid="case-tasks-list"
			>
				{#if showOpenSection}
				<section class="flex flex-col gap-3 min-h-0" data-testid="case-tasks-section-open" aria-label="Open tasks">
					<div class="flex flex-col gap-1.5 min-w-0">
						<h4 class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]">
							Open Tasks
						</h4>
						<p
							class="{DS_WORKFLOW_TEXT_CLASSES.embedCompactProse} m-0 text-[color:var(--ce-l-text-muted)]"
							data-testid="case-tasks-section-open-hint"
						>
							Operational · Not part of Timeline
						</p>
					</div>
					{#if openTasks.length === 0}
						<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]" data-testid="case-tasks-no-open">
							No open tasks
						</p>
					{:else}
						<ul class="flex flex-col gap-3 list-none m-0 p-0">
							{#each openTasks as task (task.id)}
								<li
									class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-3 py-2.5"
									data-testid="case-tasks-item"
									data-task-id={task.id}
									data-task-status="open"
									data-task-expanded={expandedTaskIds.has(task.id) ? 'true' : 'false'}
								>
									{#if editingTaskId === task.id}
										<div class="flex flex-col gap-2" data-testid="case-tasks-edit-form">
											<input
												bind:value={editTitle}
												class="w-full rounded-md border px-2 py-1 text-sm"
												data-testid="case-tasks-edit-title"
											/>
											<textarea
												bind:value={editDescription}
												rows="2"
												class="w-full rounded-md border px-2 py-1 text-sm"
												data-testid="case-tasks-edit-description"
											/>
											<input
												bind:value={editLinkedId}
												placeholder="Timeline entry ID (reference only, optional)"
												class="w-full rounded-md border px-2 py-1 text-sm"
												data-testid="case-tasks-edit-link"
											/>
											<div
												class="rounded-md border border-dashed border-[color:var(--ce-l-chrome-border)] px-3 py-2.5 flex flex-col gap-2"
												data-testid="case-tasks-edit-operational-fields"
											>
												<p
													class="{DS_TYPE_CLASSES.meta} m-0 text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
												>
													Operational tracking (optional)
												</p>
												<label class="flex flex-col gap-1">
													<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
														>Assignee</span
													>
													<select
														bind:value={editAssigneeUserId}
														class="w-full max-w-md rounded-md border px-2 py-1.5 text-sm"
														data-testid="case-tasks-edit-assignee"
														aria-label="Task assignee"
													>
														<option value="">Unassigned</option>
														{#each assignableUsers as u (u.id)}
															<option value={u.id}>{u.name} ({u.role})</option>
														{/each}
													</select>
													<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
														>Tracking only — not routing.</span
													>
												</label>
												<label class="flex flex-col gap-1">
													<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
														>Due date</span
													>
													<input
														bind:value={editDueDate}
														type="date"
														class="w-full max-w-xs rounded-md border px-2 py-1.5 text-sm"
														data-testid="case-tasks-edit-due"
														autocomplete="off"
													/>
													<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
														>Awareness only — not scheduling.</span
													>
												</label>
												<label class="flex flex-col gap-1">
													<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
														>Priority</span
													>
													<select
														bind:value={editPriority}
														class="w-full max-w-xs rounded-md border px-2 py-1.5 text-sm"
														data-testid="case-tasks-edit-priority"
														aria-label="Task priority"
													>
														<option value="">None</option>
														{#each CASE_TASK_PRIORITY_VALUES as pv (pv)}
															<option value={pv}>{formatCaseTaskPriorityLabel(pv)}</option>
														{/each}
													</select>
													<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
														>Scanning only — not escalation.</span
													>
												</label>
												<label class="flex flex-col gap-1">
													<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
														>Group label</span
													>
													<input
														bind:value={editGroupLabel}
														type="text"
														maxlength={CASE_TASK_GROUP_LABEL_MAX}
														class="w-full max-w-md rounded-md border px-2 py-1.5 text-sm"
														data-testid="case-tasks-edit-group-label"
														autocomplete="off"
														aria-label="Task group label"
													/>
													<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
														>List organization only — not workflow stages.</span
													>
												</label>
											</div>
											<div class="flex gap-2 justify-end">
												<button
													type="button"
													class="{DS_BTN_CLASSES.secondary} text-xs"
													data-testid="case-tasks-edit-cancel"
													on:click={cancelEdit}>Cancel</button
												>
												<button
													type="button"
													class="{DS_BTN_CLASSES.primary} text-xs"
													data-testid="case-tasks-edit-save"
													disabled={mutationBusy}
													on:click={() => void saveEdit(task.id)}>Save</button
												>
											</div>
										</div>
									{:else}
										<div class="flex flex-wrap items-start justify-between gap-2">
											<div class="min-w-0 flex-1 flex flex-col gap-2">
												<div class="flex flex-wrap items-start gap-2 justify-between">
													<p
														class="{DS_TYPE_CLASSES.panel} m-0 font-medium text-[color:var(--ce-l-text-primary)] line-clamp-2"
													>
														{task.title}
													</p>
													{#if caseTaskShouldOfferDetailToggle(task)}
														<button
															type="button"
															class="{DS_BTN_CLASSES.ghost} text-xs shrink-0"
															aria-expanded={expandedTaskIds.has(task.id)}
															aria-controls="case-task-detail-{task.id}"
															data-testid="case-tasks-row-toggle"
															data-task-id={task.id}
															on:click={() => toggleTaskExpanded(task.id)}
														>
															{expandedTaskIds.has(task.id) ? 'Hide details' : 'Show details'}
														</button>
													{/if}
												</div>
												<p class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
													{formatCreatedAt(task.createdAt)} · {task.createdBy}
												</p>
												<TaskOperationalRowMeta {task} {assignableUsers} />
												{#if task.description?.trim() && !caseTaskShouldOfferDetailToggle(task)}
													<p
														class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-secondary)] line-clamp-3"
													>
														{task.description}
													</p>
												{/if}
												{#if caseTaskShouldOfferDetailToggle(task) && !expandedTaskIds.has(task.id) && task.description?.trim()}
													<p
														class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-secondary)] line-clamp-2"
													>
														{task.description}
													</p>
												{/if}
												{#if expandedTaskIds.has(task.id)}
													<div
														id="case-task-detail-{task.id}"
														class="flex flex-col gap-2 min-w-0"
														data-testid="case-tasks-row-detail"
													>
														{#if task.description?.trim()}
															<p
																class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-secondary)] whitespace-pre-wrap break-words"
															>
																{task.description}
															</p>
														{/if}
														<p class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
															Updated {formatCreatedAt(task.updatedAt)}
														</p>
														{#if task.linkedTimelineEntryId}
															<div
																class="pt-2 border-t border-dashed border-[color:var(--ce-l-chrome-border)]"
															>
																<p
																	class="{DS_TYPE_CLASSES.meta} m-0 text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
																>
																	Linked Timeline Entry (reference)
																</p>
																<p
																	class="{DS_TYPE_CLASSES.mono} m-0 mt-0.5 text-xs break-all text-[color:var(--ce-l-text-muted)]"
																	data-testid="case-tasks-linked-id"
																>
																	{task.linkedTimelineEntryId}
																</p>
																<button
																	type="button"
																	class="{DS_BTN_CLASSES.ghost} mt-1 text-xs"
																	data-testid="case-tasks-view-timeline"
																	title={VIEW_LINKED_TIMELINE_ENTRY_TITLE}
																	on:click={() => viewInTimeline(task.linkedTimelineEntryId ?? '')}
																>
																	View in Timeline
																</button>
															</div>
														{/if}
													</div>
												{/if}
											</div>
											<div class="flex flex-col gap-1 items-end shrink-0">
												<button
													type="button"
													class="{DS_BTN_CLASSES.secondary} text-xs"
													data-testid="case-tasks-mark-complete"
													data-task-id={task.id}
													disabled={mutationBusy}
													on:click={() => void doComplete(task.id)}
												>
													Mark complete
												</button>
												<button
													type="button"
													class="{DS_BTN_CLASSES.ghost} text-xs"
													data-testid="case-tasks-archive"
													disabled={mutationBusy}
													on:click={() => void doArchive(task.id)}
												>
													Archive
												</button>
												<button
													type="button"
													class="{DS_BTN_CLASSES.ghost} text-xs"
													data-testid="case-tasks-edit-open"
													disabled={mutationBusy}
													on:click={() => startEdit(task)}
												>
													Edit
												</button>
												<button
													type="button"
													class="{DS_BTN_CLASSES.ghost} text-xs text-red-700"
													data-testid="case-tasks-delete"
													disabled={mutationBusy}
													on:click={() => void doDelete(task.id)}
												>
													Delete
												</button>
											</div>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
				{/if}

				{#if showCompletedSection}
				<section
					class="flex flex-col gap-3 min-h-0 pt-4 border-t border-dashed border-[color:var(--ce-l-chrome-border)]"
					data-testid="case-tasks-section-completed"
					aria-label="Completed tasks"
				>
					<div class="flex flex-col gap-1.5 min-w-0">
						<h4 class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-muted)]">
							Completed (Operational Only)
						</h4>
						<p
							class="{DS_WORKFLOW_TEXT_CLASSES.embedCompactProse} m-0 text-[color:var(--ce-l-text-muted)]"
							data-testid="case-tasks-section-completed-hint"
						>
							Operational · Not part of Timeline
						</p>
					</div>
					{#if completedTasks.length === 0}
						<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]">
							No completed tasks yet
						</p>
					{:else}
						<ul class="flex flex-col gap-3 list-none m-0 p-0">
							{#each completedTasks as task (task.id)}
								{@const completionAttr = formatCaseTaskCompletionAttribution(task)}
								<li
									class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] px-3 py-2.5 opacity-90"
									data-testid="case-tasks-item"
									data-task-id={task.id}
									data-task-status="completed"
									data-task-expanded={expandedTaskIds.has(task.id) ? 'true' : 'false'}
								>
									{#if editingTaskId === task.id}
										<div class="flex flex-col gap-2" data-testid="case-tasks-edit-form">
											<input bind:value={editTitle} class="w-full rounded-md border px-2 py-1 text-sm" />
											<textarea bind:value={editDescription} rows="2" class="w-full rounded-md border px-2 py-1 text-sm" />
											<input bind:value={editLinkedId} class="w-full rounded-md border px-2 py-1 text-sm" />
											<div
												class="rounded-md border border-dashed border-[color:var(--ce-l-chrome-border)] px-3 py-2.5 flex flex-col gap-2"
												data-testid="case-tasks-edit-operational-fields"
											>
												<p
													class="{DS_TYPE_CLASSES.meta} m-0 text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
												>
													Operational tracking (optional)
												</p>
												<label class="flex flex-col gap-1">
													<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
														>Assignee</span
													>
													<select
														bind:value={editAssigneeUserId}
														class="w-full max-w-md rounded-md border px-2 py-1.5 text-sm"
														data-testid="case-tasks-edit-assignee"
														aria-label="Task assignee"
													>
														<option value="">Unassigned</option>
														{#each assignableUsers as u (u.id)}
															<option value={u.id}>{u.name} ({u.role})</option>
														{/each}
													</select>
													<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
														>Tracking only — not routing.</span
													>
												</label>
												<label class="flex flex-col gap-1">
													<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
														>Due date</span
													>
													<input
														bind:value={editDueDate}
														type="date"
														class="w-full max-w-xs rounded-md border px-2 py-1.5 text-sm"
														data-testid="case-tasks-edit-due"
														autocomplete="off"
													/>
													<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
														>Awareness only — not scheduling.</span
													>
												</label>
												<label class="flex flex-col gap-1">
													<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
														>Priority</span
													>
													<select
														bind:value={editPriority}
														class="w-full max-w-xs rounded-md border px-2 py-1.5 text-sm"
														data-testid="case-tasks-edit-priority"
														aria-label="Task priority"
													>
														<option value="">None</option>
														{#each CASE_TASK_PRIORITY_VALUES as pv (pv)}
															<option value={pv}>{formatCaseTaskPriorityLabel(pv)}</option>
														{/each}
													</select>
													<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
														>Scanning only — not escalation.</span
													>
												</label>
												<label class="flex flex-col gap-1">
													<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
														>Group label</span
													>
													<input
														bind:value={editGroupLabel}
														type="text"
														maxlength={CASE_TASK_GROUP_LABEL_MAX}
														class="w-full max-w-md rounded-md border px-2 py-1.5 text-sm"
														data-testid="case-tasks-edit-group-label"
														autocomplete="off"
														aria-label="Task group label"
													/>
													<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
														>List organization only — not workflow stages.</span
													>
												</label>
											</div>
											<div class="flex gap-2 justify-end">
												<button type="button" class="{DS_BTN_CLASSES.secondary} text-xs" on:click={cancelEdit}
													>Cancel</button
												>
												<button
													type="button"
													class="{DS_BTN_CLASSES.primary} text-xs"
													disabled={mutationBusy}
													on:click={() => void saveEdit(task.id)}>Save</button
												>
											</div>
										</div>
									{:else}
										<div class="flex flex-wrap items-start justify-between gap-2">
											<div class="min-w-0 flex-1 flex flex-col gap-2">
												<div class="flex flex-wrap items-start gap-2 justify-between">
													<p
														class="{DS_TYPE_CLASSES.panel} m-0 font-medium text-[color:var(--ce-l-text-muted)] line-through line-clamp-2"
													>
														{task.title}
													</p>
													{#if caseTaskShouldOfferDetailToggle(task)}
														<button
															type="button"
															class="{DS_BTN_CLASSES.ghost} text-xs shrink-0"
															aria-expanded={expandedTaskIds.has(task.id)}
															aria-controls="case-task-detail-{task.id}"
															data-testid="case-tasks-row-toggle"
															data-task-id={task.id}
															on:click={() => toggleTaskExpanded(task.id)}
														>
															{expandedTaskIds.has(task.id) ? 'Hide details' : 'Show details'}
														</button>
													{/if}
												</div>
												<p class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
													{formatCreatedAt(task.createdAt)} · {task.createdBy}
												</p>
												<TaskOperationalRowMeta {task} {assignableUsers} />
												{#if completionAttr}
													<p
														class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
														data-testid="case-tasks-completion-attribution"
													>
														{completionAttr}
													</p>
												{/if}
												{#if task.description?.trim() && !caseTaskShouldOfferDetailToggle(task)}
													<p
														class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)] line-clamp-3"
													>
														{task.description}
													</p>
												{/if}
												{#if caseTaskShouldOfferDetailToggle(task) && !expandedTaskIds.has(task.id) && task.description?.trim()}
													<p
														class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)] line-clamp-2"
													>
														{task.description}
													</p>
												{/if}
												{#if expandedTaskIds.has(task.id)}
													<div
														id="case-task-detail-{task.id}"
														class="flex flex-col gap-2 min-w-0"
														data-testid="case-tasks-row-detail"
													>
														{#if task.description?.trim()}
															<p
																class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)] whitespace-pre-wrap break-words"
															>
																{task.description}
															</p>
														{/if}
														<p class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
															Updated {formatCreatedAt(task.updatedAt)}
														</p>
														{#if task.linkedTimelineEntryId}
															<div
																class="pt-2 border-t border-dashed border-[color:var(--ce-l-chrome-border)]"
															>
																<p
																	class="{DS_TYPE_CLASSES.meta} m-0 text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
																>
																	Linked Timeline Entry (reference)
																</p>
																<p
																	class="{DS_TYPE_CLASSES.mono} m-0 mt-0.5 text-xs break-all text-[color:var(--ce-l-text-muted)]"
																	data-testid="case-tasks-linked-id"
																>
																	{task.linkedTimelineEntryId}
																</p>
																<button
																	type="button"
																	class="{DS_BTN_CLASSES.ghost} mt-1 text-xs"
																	data-testid="case-tasks-view-timeline"
																	title={VIEW_LINKED_TIMELINE_ENTRY_TITLE}
																	on:click={() => viewInTimeline(task.linkedTimelineEntryId ?? '')}
																>
																	View in Timeline
																</button>
															</div>
														{/if}
													</div>
												{/if}
											</div>
											<div class="flex flex-col gap-1 items-end shrink-0">
												<button
													type="button"
													class="{DS_BTN_CLASSES.ghost} shrink-0 text-xs"
													data-testid="case-tasks-mark-open"
													data-task-id={task.id}
													disabled={mutationBusy}
													on:click={() => void doReopen(task.id)}
												>
													Reopen
												</button>
												<button
													type="button"
													class="{DS_BTN_CLASSES.ghost} text-xs"
													disabled={mutationBusy}
													on:click={() => void doArchive(task.id)}
												>
													Archive
												</button>
												<button
													type="button"
													class="{DS_BTN_CLASSES.ghost} text-xs"
													disabled={mutationBusy}
													on:click={() => startEdit(task)}
												>
													Edit
												</button>
												<button
													type="button"
													class="{DS_BTN_CLASSES.ghost} text-xs text-red-700"
													data-testid="case-tasks-delete"
													disabled={mutationBusy}
													on:click={() => void doDelete(task.id)}
												>
													Delete
												</button>
											</div>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>
				{/if}

				{#if showArchivedSection}
				<section
					class="flex flex-col gap-3 min-h-0 pt-4 border-t border-dashed border-[color:var(--ce-l-chrome-border)]"
					data-testid="case-tasks-section-archived"
					aria-label="Archived tasks"
				>
					<div class="flex flex-col gap-1.5 min-w-0">
						<h4 class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-muted)]">
							Archived
						</h4>
						<p class="{DS_WORKFLOW_TEXT_CLASSES.embedCompactProse} m-0 text-[color:var(--ce-l-text-muted)]">
							Operational · Not part of Timeline
						</p>
					</div>
					{#if archivedTasks.length === 0}
						<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]">No archived tasks</p>
					{:else}
						<ul class="flex flex-col gap-3 list-none m-0 p-0">
							{#each archivedTasks as task (task.id)}
								{@const archiveAttr = formatCaseTaskArchiveAttribution(task)}
								<li
									class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] px-3 py-2.5 opacity-80"
									data-testid="case-tasks-item"
									data-task-id={task.id}
									data-task-status="archived"
									data-task-expanded={expandedTaskIds.has(task.id) ? 'true' : 'false'}
								>
									<div class="flex flex-wrap items-start justify-between gap-2">
										<div class="min-w-0 flex-1 flex flex-col gap-2">
											<div class="flex flex-wrap items-start gap-2 justify-between">
												<p
													class="{DS_TYPE_CLASSES.panel} m-0 font-medium text-[color:var(--ce-l-text-muted)] line-clamp-2"
												>
													{task.title}
												</p>
												{#if caseTaskShouldOfferDetailToggle(task)}
													<button
														type="button"
														class="{DS_BTN_CLASSES.ghost} text-xs shrink-0"
														aria-expanded={expandedTaskIds.has(task.id)}
														aria-controls="case-task-detail-{task.id}"
														data-testid="case-tasks-row-toggle"
														data-task-id={task.id}
														on:click={() => toggleTaskExpanded(task.id)}
													>
														{expandedTaskIds.has(task.id) ? 'Hide details' : 'Show details'}
													</button>
												{/if}
											</div>
											<p class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
												{formatCreatedAt(task.createdAt)} · {task.createdBy}
											</p>
											<TaskOperationalRowMeta {task} {assignableUsers} />
											{#if archiveAttr}
												<p
													class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
													data-testid="case-tasks-archive-attribution"
												>
													{archiveAttr}
												</p>
											{/if}
											{#if task.description?.trim() && !caseTaskShouldOfferDetailToggle(task)}
												<p
													class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)] line-clamp-3"
												>
													{task.description}
												</p>
											{/if}
											{#if caseTaskShouldOfferDetailToggle(task) && !expandedTaskIds.has(task.id) && task.description?.trim()}
												<p
													class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)] line-clamp-2"
												>
													{task.description}
												</p>
											{/if}
											{#if expandedTaskIds.has(task.id)}
												<div
													id="case-task-detail-{task.id}"
													class="flex flex-col gap-2 min-w-0"
													data-testid="case-tasks-row-detail"
												>
													{#if task.description?.trim()}
														<p
															class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)] whitespace-pre-wrap break-words"
														>
															{task.description}
														</p>
													{/if}
													<p class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
														Updated {formatCreatedAt(task.updatedAt)}
													</p>
													{#if task.linkedTimelineEntryId}
														<div
															class="pt-2 border-t border-dashed border-[color:var(--ce-l-chrome-border)]"
														>
															<p
																class="{DS_TYPE_CLASSES.meta} m-0 text-[10px] uppercase tracking-wide text-[color:var(--ce-l-text-muted)]"
															>
																Linked Timeline Entry (reference)
															</p>
															<p
																class="{DS_TYPE_CLASSES.mono} m-0 mt-0.5 text-xs break-all text-[color:var(--ce-l-text-muted)]"
																data-testid="case-tasks-linked-id"
															>
																{task.linkedTimelineEntryId}
															</p>
															<button
																type="button"
																class="{DS_BTN_CLASSES.ghost} mt-1 text-xs"
																data-testid="case-tasks-view-timeline"
																title={VIEW_LINKED_TIMELINE_ENTRY_TITLE}
																on:click={() => viewInTimeline(task.linkedTimelineEntryId ?? '')}
															>
																View in Timeline
															</button>
														</div>
													{/if}
												</div>
											{/if}
										</div>
										<div class="flex flex-col gap-1 items-end shrink-0">
											<button
												type="button"
												class="{DS_BTN_CLASSES.secondary} text-xs"
												disabled={mutationBusy}
												on:click={() => void doReopen(task.id)}
											>
												Reopen
											</button>
											<button
												type="button"
												class="{DS_BTN_CLASSES.ghost} text-xs text-red-700"
												disabled={mutationBusy}
												on:click={() => void doDelete(task.id)}
											>
												Delete
											</button>
										</div>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</section>
				{/if}

				{#if showDeleted && statusFilter === 'all' && deletedTasksSorted.length > 0}
					<section
						class="flex flex-col gap-3 min-h-0 pt-4 border-t border-dashed border-[color:var(--ce-l-chrome-border)]"
						data-testid="case-tasks-section-deleted"
						aria-label="Soft-deleted tasks"
					>
						<div class="flex flex-col gap-1.5 min-w-0">
							<h4
								class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-muted)]"
							>
								Soft-deleted (awareness only)
							</h4>
							<p
								class="{DS_WORKFLOW_TEXT_CLASSES.embedCompactProse} m-0 text-[color:var(--ce-l-text-muted)]"
							>
								Removed from the active list — reference only. Not part of Timeline.
							</p>
						</div>
						<ul class="flex flex-col gap-3 list-none m-0 p-0">
							{#each deletedTasksSorted as task (task.id)}
								{@const delAttr = formatCaseTaskSoftDeleteAttribution(task)}
								<li
									class="rounded-md border border-dashed border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] px-3 py-2.5 opacity-75"
									data-testid="case-tasks-item-deleted"
									data-task-id={task.id}
									data-task-status="deleted"
								>
									<div class="min-w-0 flex flex-col gap-1.5">
										<p
											class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-medium text-[color:var(--ce-l-text-muted)] line-clamp-2"
										>
											{task.title}
										</p>
										{#if delAttr}
											<p
												class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
												data-testid="case-tasks-deleted-attribution"
											>
												{delAttr}
											</p>
										{/if}
										<p class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
											Created {formatCreatedAt(task.createdAt)} · {task.createdBy}
										</p>
										<TaskOperationalRowMeta {task} {assignableUsers} />
										{#if task.description?.trim()}
											<p
												class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)] line-clamp-4"
											>
												{task.description}
											</p>
										{/if}
										{#if task.linkedTimelineEntryId}
											<p class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
												Timeline entry (reference):
												<span class="{DS_TYPE_CLASSES.mono} break-all">{task.linkedTimelineEntryId}</span>
											</p>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>
		{/if}
	</div>
</div>
