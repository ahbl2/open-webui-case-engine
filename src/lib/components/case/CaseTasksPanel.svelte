<script lang="ts">
	/**
	 * P86 / P87 — Tasks shell (operational, not Timeline).
	 * P87-05 — Cross-surface read-layer hints (operational vs Timeline).
	 * P89-07 — Persisted Case Engine Tasks: list/create/PATCH/lifecycle/delete/restore; reconcile from server.
	 * P90-01 — Client-side lifecycle status filter on loaded list (render-only).
	 * P90-02 — Client-side sort by task created time (operational; not Timeline).
	 * P90-03 — Expand/collapse row details (display-only; scannable collapsed summary).
	 * P90-04 — Lifecycle attribution (completed_by / archived_by; display-only).
	 * P90-05 — Optional read-only soft-deleted rows (include_deleted list; separate section).
	 * P90-06 — UX copy: Tasks = operational only vs Timeline (no behavior changes).
	 * P91-05 — Panel coherence: unified operational field order and shared row meta block.
	 * P91-06 — Guardrails: canonical Tasks-vs-Timeline copy; no Timeline logging/promotion affordances; sort = scanning only.
	 * P92-01 — Multi-criteria client-side filters (session-only).
	 * P92-02 — Dedicated debounced text search (session-only).
	 * P92-03 — Expanded vs compact row density (presentation only; session-only).
	 * P92-04 — Explicit bulk selection + complete/archive/restore (operator-initiated; no workflow).
	 * P92-05 — Read-only same-case note/file links (navigation only; not Timeline).
	 * P92-06 — Guardrail reinforcement: operational-only posture; no workflow/Timeline drift (see tests).
	 * P93-01 — Optional visual grouping (group_label / priority); UI-only; non-persistent; after filter pipeline.
	 * P93-02 — Explicit sort field + direction + quick presets (UI-only; maps to existing list sort modes).
	 * P93-03 — Scan cues (overdue / priority); render-time only; TaskOperationalRowMeta `scanSection`.
	 * P93-04 — Pin / unpin (attention mark); server-backed PATCH only; no ordering or grouping impact.
	 * P93-05 — UX polish + empty-state clarity (copy/layout only; no behavior, persistence, or API changes).
	 * P94-01 — Row title vs description preview hierarchy (typography + overflow; existing clamps/toggles unchanged).
	 * P94-02 — Operational metadata (TaskOperationalRowMeta): labeled fields, order assignee→due→group→priority; row stack title→description→created→meta.
	 * P94-03 — Inline note/file cross-ref counts (CaseTaskRowContextSignals) below task meta, above lifecycle lines.
	 * P94-04 — Row hover/focus affordances (ce-task-row + scoped CSS); no new behavior.
	 * P94-05 — Cross-state row stack: unified primary column gap + soft-deleted created line format.
	 * P98-03 — Declared relationship read-only strip (P98-01 contract; TasksDeclaredRelationshipsBlock); no navigation here.
	 */
	import { onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import CaseArrivalOrientationBlock from '$lib/components/case/CaseArrivalOrientationBlock.svelte';
	import { nextP99ArrivalSnapshot } from '$lib/case/p99ArrivalContextPresentation';
	import type { ArrivalContext } from '$lib/case/p99ArrivalContextReadModel';
	import { clearSynthesisNavigationPageState } from '$lib/case/synthesisNavigationClear';
	import { buildSupportingTaskContextPreview } from '$lib/case/synthesisNavigationContextPreview';
	import {
		P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS,
		scheduleStaleSynthesisIntentClear
	} from '$lib/case/synthesisNavigationP97Shared';
	import { pickSupportingTaskTargetId } from '$lib/case/supportingSynthesisNavigation';
	import { caseEngineToken } from '$lib/stores';
	import * as caseTasksApi from '$lib/apis/caseEngine/caseTasksApi';
	import type { CaseEngineAssignableUser } from '$lib/apis/caseEngine/caseTasksApi';
	import type {
		CaseTask,
		CaseTaskGroupByMode,
		CaseTaskListSortMode,
		CaseTaskSortField,
		CaseTaskStatusFilter,
		TaskDensityMode
	} from '$lib/case/caseTaskModel';
	import {
		applyCaseTaskFilters,
		applyCaseTaskMultiCriteriaFilters,
		applyCaseTaskTextSearch,
		caseEngineTaskToCaseTask,
		caseTaskBulkArchiveEligible,
		caseTaskBulkCompleteEligible,
		caseTaskBulkRestoreEligible,
		caseTaskMultiCriteriaFilterFromUiState,
		caseTaskShouldOfferDetailToggle,
		CASE_TASK_FILTER_UNASSIGNED,
		CASE_TASK_GROUP_LABEL_MAX,
		CASE_TASK_PRIORITY_VALUES,
		CASE_TASK_SORT_QUICK_PRESET,
		caseTaskListSortModeFromFieldAndPairIndex,
		caseTaskSortActiveSummary,
		caseTaskSortFieldFromListSortMode,
		caseTaskSortPairDirectionLabels,
		caseTaskSortPairIndexFromListSortMode,
		collectDistinctCaseTaskGroupLabels,
		formatCaseTaskArchiveAttribution,
		formatCaseTaskCompletionAttribution,
		formatCaseTaskPriorityLabel,
		formatCaseTaskSoftDeleteAttribution,
		groupCaseTasksForVisualList,
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
	import CaseTaskRowContextSignals from './CaseTaskRowContextSignals.svelte';
	import CaseTaskCrossRefsSection from './CaseTaskCrossRefsSection.svelte';
	import TasksDeclaredRelationshipsBlock from './TasksDeclaredRelationshipsBlock.svelte';
	import CaseTaskPinToggle from './CaseTaskPinToggle.svelte';
	import CaseTaskPinnedGlyph from './CaseTaskPinnedGlyph.svelte';
	import SynthesisNavigationContextPreview from './SynthesisNavigationContextPreview.svelte';

	/** P91-06: "View in Timeline" navigates to an existing linked entry only; does not create or alter Timeline from this task. */
	const VIEW_LINKED_TIMELINE_ENTRY_TITLE =
		'Open the linked official Timeline entry (navigation only). Does not log or promote this task.';

	/** P91-06 / P93-05: shared section hint (operational vs Timeline). */
	const CASE_TASK_SECTION_HINT = 'Operational · Not part of Timeline';

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

	const TASK_SEARCH_DEBOUNCE_MS = 200;

	/** P90-01: render-only lifecycle status; not persisted; does not replace `tasks`. */
	let statusFilter: CaseTaskStatusFilter = 'all';
	/** P92-02: raw search input; debounced into `taskSearchQuery`. */
	let taskSearchInputRaw = '';
	/** P92-02: debounced query driving {@link applyCaseTaskTextSearch}. */
	let taskSearchQuery = '';
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	/** P92-01: multi-criteria UI (session-only). */
	let filterAssigneeUserId = '';
	let filterDueStatus = '';
	let filterPriorityLow = false;
	let filterPriorityMedium = false;
	let filterPriorityHigh = false;
	let filterGroupLabel = '';
	/** P90-02 / P91-02: default matches API list order (`created_at DESC`) or optional due-date sort. */
	let listSortMode: CaseTaskListSortMode = 'created_newest';

	/** P90-03: which task ids show expanded detail (display-only; cleared on case/token change). */
	let expandedTaskIds: Set<string> = new Set();

	/** P90-05: when true, list fetch includes soft-deleted rows (read-only section). */
	let showDeleted = false;

	/** P92-03: row presentation only; reset on case/token change */
	let taskDensityMode: TaskDensityMode = 'expanded';

	/** P92-04: session-only bulk selection (not persisted). */
	let selectedTaskIds: Set<string> = new Set();

	/** P93-01: UI-only grouping (non-persistent; resets on case/token change). */
	let taskGroupByMode: CaseTaskGroupByMode = 'none';
	/** P93-01: collapsed group keys `section|groupKey` (default expanded = key absent). */
	let collapsedTaskGroupKeys: Set<string> = new Set();

	let prevLoadKey = '';

	// P97-03 — synthesis → Tasks supporting surface (read-only; ephemeral)
	// P97-04 — orientation preview (cleared with highlight; not persisted)
	let navTargetId: string | null = null;
	let revealInFlight = false;
	let synthesisHighlightId: string | null = null;
	let synthesisContextPreview: { headline: string; lines: string[] } | null = null;
	let synthesisRevealBanner: 'idle' | 'not_found' = 'idle';
	let synthesisHighlightTimer: ReturnType<typeof setTimeout> | undefined;
	let invalidSynthesisIntentClearInFlight = false;
	/** P99-02 — synthesis arrival snapshot (in-memory only). */
	let p99ArrivalSnapshot: ArrivalContext | null = null;
	let p99ArrivalTasksCaseKey = '';

	function handleTaskSearchInput(): void {
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			searchDebounceTimer = null;
			taskSearchQuery = taskSearchInputRaw.trim();
		}, TASK_SEARCH_DEBOUNCE_MS);
	}

	function clearTaskSearchImmediate(): void {
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = null;
		taskSearchInputRaw = '';
		taskSearchQuery = '';
	}

	function clearAllFilters(): void {
		statusFilter = 'all';
		clearTaskSearchImmediate();
		filterAssigneeUserId = '';
		filterDueStatus = '';
		filterPriorityLow = false;
		filterPriorityMedium = false;
		filterPriorityHigh = false;
		filterGroupLabel = '';
	}

	async function runRevealSequenceForSynthesisTasks(): Promise<void> {
		if (!browser || !navTargetId || revealInFlight) return;
		if (listLoading || listError) return;
		revealInFlight = true;
		try {
			const targetId = navTargetId;
			await tick();
			const exists = tasks.some((t) => t.id === targetId);
			if (!exists) {
				synthesisContextPreview = null;
				synthesisRevealBanner = 'not_found';
				navTargetId = null;
				await clearSynthesisNavigationPageState(get(page));
				return;
			}
			await tick();
			await tick();
			const el = document.getElementById(`ce-case-task-${targetId}`);
			if (!el) {
				synthesisContextPreview = null;
				synthesisRevealBanner = 'not_found';
				navTargetId = null;
				await clearSynthesisNavigationPageState(get(page));
				return;
			}
			const hitTask = tasks.find((t) => t.id === targetId);
			synthesisContextPreview = hitTask ? buildSupportingTaskContextPreview(hitTask) : null;
			el.scrollIntoView({ block: 'center', behavior: 'auto' });
			synthesisHighlightId = targetId;
			if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
			synthesisHighlightTimer = setTimeout(() => {
				synthesisHighlightId = null;
				synthesisContextPreview = null;
				synthesisHighlightTimer = undefined;
			}, P97_SYNTHESIS_REVEAL_HIGHLIGHT_MS);
			navTargetId = null;
			synthesisRevealBanner = 'idle';
			await clearSynthesisNavigationPageState(get(page));
		} finally {
			revealInFlight = false;
		}
	}

	onDestroy(() => {
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
	});

	$: taskRowPad = taskDensityMode === 'compact' ? 'px-2 py-1.5' : 'px-3 py-2.5';
	$: taskListGap = taskDensityMode === 'compact' ? 'gap-1.5' : 'gap-3';
	$: taskRowInnerGap = taskDensityMode === 'compact' ? 'gap-1' : 'gap-2';
	$: taskTitleClamp = taskDensityMode === 'compact' ? 'line-clamp-1' : 'line-clamp-2';
	$: taskDescClampCollapsed = taskDensityMode === 'compact' ? 'line-clamp-1' : 'line-clamp-2';
	$: taskDescClampInline = taskDensityMode === 'compact' ? 'line-clamp-2' : 'line-clamp-3';
	$: taskMainListGap = taskDensityMode === 'compact' ? 'gap-4' : 'gap-6';
	$: taskRowDensityClass = taskDensityMode === 'compact' ? 'task-row task-row--compact' : 'task-row task-row--expanded';
	$: taskDeletedDescClamp = taskDensityMode === 'compact' ? 'line-clamp-2' : 'line-clamp-4';
	/** P94-05: same vertical rhythm for open / completed / archived / soft-deleted primary stacks. */
	$: taskRowPrimaryStackClass = `ce-task-row__primary min-w-0 flex-1 flex flex-col ${taskRowInnerGap}`;

	/** P94-01: title dominance + overflow-safe wrapping (same clamps as P92-03). */
	$: taskTitleLeadClass = 'font-semibold leading-snug';
	$: taskTitleSizeClass = taskDensityMode === 'compact' ? 'text-sm' : 'text-base';
	$: taskTitleOverflowClass = 'break-words [overflow-wrap:anywhere]';
	/** Preview lines stay secondary vs title; deterministic line-clamp strings unchanged above. */
	$: taskDescPreviewBaseClass = `${DS_TYPE_CLASSES.body} m-0 text-xs leading-snug break-words [overflow-wrap:anywhere]`;

	$: caseId = typeof $page.params.id === 'string' ? $page.params.id : '';
	$: ceToken = $caseEngineToken;

	$: multiCriteriaFilter = caseTaskMultiCriteriaFilterFromUiState({
		assigneeUserId: filterAssigneeUserId,
		dueStatus: filterDueStatus,
		priorityLow: filterPriorityLow,
		priorityMedium: filterPriorityMedium,
		priorityHigh: filterPriorityHigh,
		groupLabel: filterGroupLabel
	});
	$: distinctGroupLabels = collectDistinctCaseTaskGroupLabels(tasks);

	/** P93-05: true when search or any filter narrows the list (for empty-state copy only). */
	$: taskPanelHasNarrowingFilters =
		taskSearchQuery.trim() !== '' ||
		statusFilter !== 'all' ||
		filterAssigneeUserId !== '' ||
		filterDueStatus !== '' ||
		filterPriorityLow ||
		filterPriorityMedium ||
		filterPriorityHigh ||
		filterGroupLabel.trim() !== '';

	$: activeTasks = tasks.filter((t) => !t.deletedAt);
	$: statusFilteredActive = applyCaseTaskFilters(activeTasks, { statusFilter });
	$: searchFilteredActive = applyCaseTaskTextSearch(statusFilteredActive, taskSearchQuery);
	$: filteredTasks = applyCaseTaskMultiCriteriaFilters(searchFilteredActive, multiCriteriaFilter);
	$: sortedFilteredTasks = sortCaseTasksForList(filteredTasks, listSortMode);
	$: deletedTasksRaw = tasks.filter((t) => Boolean(t.deletedAt));
	$: deletedStatusFiltered = applyCaseTaskFilters(deletedTasksRaw, { statusFilter: 'all' });
	$: deletedSearchFiltered = applyCaseTaskTextSearch(deletedStatusFiltered, taskSearchQuery);
	$: deletedTasksFiltered = applyCaseTaskMultiCriteriaFilters(deletedSearchFiltered, multiCriteriaFilter);
	$: deletedTasksSorted =
		listSortMode === 'group_label_a_z' || listSortMode === 'group_label_z_a'
			? sortCaseTasksForList(deletedTasksFiltered, listSortMode)
			: sortCaseTasksByDeletedAtDesc(deletedTasksFiltered);
	$: openTasks = sortedFilteredTasks.filter((t) => t.status === 'open');
	$: completedTasks = sortedFilteredTasks.filter((t) => t.status === 'completed');
	$: archivedTasks = sortedFilteredTasks.filter((t) => t.status === 'archived');
	/** P93-01: applied after sort; single synthetic group when mode is none (no group chrome). */
	$: openTaskDisplayGroups =
		taskGroupByMode === 'none'
			? [{ key: '__all__', label: '', tasks: openTasks }]
			: groupCaseTasksForVisualList(openTasks, taskGroupByMode);
	$: completedTaskDisplayGroups =
		taskGroupByMode === 'none'
			? [{ key: '__all__', label: '', tasks: completedTasks }]
			: groupCaseTasksForVisualList(completedTasks, taskGroupByMode);
	$: archivedTaskDisplayGroups =
		taskGroupByMode === 'none'
			? [{ key: '__all__', label: '', tasks: archivedTasks }]
			: groupCaseTasksForVisualList(archivedTasks, taskGroupByMode);
	$: deletedTaskDisplayGroups =
		taskGroupByMode === 'none'
			? [{ key: '__all__', label: '', tasks: deletedTasksSorted }]
			: groupCaseTasksForVisualList(deletedTasksSorted, taskGroupByMode);
	/** P93-02: derived from {@link listSortMode} for field + direction UI. */
	$: sortFieldUi = caseTaskSortFieldFromListSortMode(listSortMode);
	$: sortPairIndexUi = caseTaskSortPairIndexFromListSortMode(listSortMode);
	$: sortPairLabels = caseTaskSortPairDirectionLabels(sortFieldUi);
	$: sortActiveSummary = caseTaskSortActiveSummary(listSortMode);
	$: showOpenSection = statusFilter === 'all' || statusFilter === 'open';
	$: showCompletedSection = statusFilter === 'all' || statusFilter === 'completed';
	$: showArchivedSection = statusFilter === 'all' || statusFilter === 'archived';

	// P97-03 — consume synthesis navigation intent on Tasks route only
	$: if (browser && caseId) {
		if (caseId !== p99ArrivalTasksCaseKey) {
			p99ArrivalTasksCaseKey = caseId;
			p99ArrivalSnapshot = null;
		}
		p99ArrivalSnapshot = nextP99ArrivalSnapshot($page.state, caseId, 'tasks', p99ArrivalSnapshot);
	}

	$: if (browser && caseId && $page.url.pathname.includes('/tasks')) {
		const intent = $page.state?.synthesisSourceNavigationIntent;
		if (intent) {
			const id = pickSupportingTaskTargetId(intent, caseId);
			if (!id) {
				scheduleStaleSynthesisIntentClear(
					() => get(page),
					() => invalidSynthesisIntentClearInFlight,
					(v) => {
						invalidSynthesisIntentClearInFlight = v;
					}
				);
			} else if (!navTargetId && !revealInFlight) {
				navTargetId = id;
				synthesisRevealBanner = 'idle';
			}
		}
	}

	$: if (browser && navTargetId && !listLoading && !listError) {
		void runRevealSequenceForSynthesisTasks();
	}

	$: if (listError && navTargetId) {
		navTargetId = null;
		synthesisContextPreview = null;
		synthesisRevealBanner = 'idle';
		void clearSynthesisNavigationPageState(get(page));
	}

	$: selectedTaskList = tasks.filter((t) => selectedTaskIds.has(t.id));
	$: bulkKind =
		selectedTaskList.length === 0
			? 'empty'
			: selectedTaskList.some((t) => t.deletedAt) && selectedTaskList.some((t) => !t.deletedAt)
				? 'mixed'
				: selectedTaskList.some((t) => t.deletedAt)
					? 'deleted'
					: 'active';
	$: canBulkCompleteAll =
		bulkKind === 'active' &&
		selectedTaskList.length > 0 &&
		selectedTaskList.every((t) => caseTaskBulkCompleteEligible(t));
	$: canBulkArchiveAll =
		bulkKind === 'active' &&
		selectedTaskList.length > 0 &&
		selectedTaskList.every((t) => caseTaskBulkArchiveEligible(t));
	$: canBulkRestoreAll =
		bulkKind === 'deleted' &&
		selectedTaskList.length > 0 &&
		selectedTaskList.every((t) => caseTaskBulkRestoreEligible(t));

	$: visibleActiveTaskCount = openTasks.length + completedTasks.length + archivedTasks.length;

	$: {
		const activeVisible = new Set([
			...openTasks.map((t) => t.id),
			...completedTasks.map((t) => t.id),
			...archivedTasks.map((t) => t.id)
		]);
		const delVisible = new Set(deletedTasksSorted.map((t) => t.id));
		const pruned = new Set([...selectedTaskIds].filter((id) => activeVisible.has(id) || delVisible.has(id)));
		if (pruned.size !== selectedTaskIds.size) {
			selectedTaskIds = pruned;
		}
	}

	$: {
		const key = `${caseId}|${ceToken ?? ''}`;
		if (!caseId || !ceToken) {
			tasks = [];
			prevLoadKey = '';
			statusFilter = 'all';
			clearTaskSearchImmediate();
			filterAssigneeUserId = '';
			filterDueStatus = '';
			filterPriorityLow = false;
			filterPriorityMedium = false;
			filterPriorityHigh = false;
			filterGroupLabel = '';
			listSortMode = 'created_newest';
			expandedTaskIds = new Set();
			showDeleted = false;
			assignableUsers = [];
			taskDensityMode = 'expanded';
			selectedTaskIds = new Set();
			taskGroupByMode = 'none';
			collapsedTaskGroupKeys = new Set();
			navTargetId = null;
			revealInFlight = false;
			synthesisHighlightId = null;
			synthesisContextPreview = null;
			synthesisRevealBanner = 'idle';
			if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
			synthesisHighlightTimer = undefined;
			invalidSynthesisIntentClearInFlight = false;
			p99ArrivalSnapshot = null;
			p99ArrivalTasksCaseKey = '';
		} else if (key !== prevLoadKey) {
			prevLoadKey = key;
			statusFilter = 'all';
			clearTaskSearchImmediate();
			filterAssigneeUserId = '';
			filterDueStatus = '';
			filterPriorityLow = false;
			filterPriorityMedium = false;
			filterPriorityHigh = false;
			filterGroupLabel = '';
			listSortMode = 'created_newest';
			expandedTaskIds = new Set();
			showDeleted = false;
			assignableUsers = [];
			taskDensityMode = 'expanded';
			selectedTaskIds = new Set();
			taskGroupByMode = 'none';
			collapsedTaskGroupKeys = new Set();
			navTargetId = null;
			revealInFlight = false;
			synthesisHighlightId = null;
			synthesisContextPreview = null;
			synthesisRevealBanner = 'idle';
			if (synthesisHighlightTimer) clearTimeout(synthesisHighlightTimer);
			synthesisHighlightTimer = undefined;
			invalidSynthesisIntentClearInFlight = false;
			p99ArrivalSnapshot = null;
			p99ArrivalTasksCaseKey = '';
			void loadTasks();
		}
	}

	function toggleTaskExpanded(taskId: string): void {
		const next = new Set(expandedTaskIds);
		if (next.has(taskId)) next.delete(taskId);
		else next.add(taskId);
		expandedTaskIds = next;
	}

	function sanitizeTaskGroupDomIdPart(s: string): string {
		return s.replace(/[^a-zA-Z0-9_-]/g, '_');
	}

	function taskGroupPanelId(section: string, groupKey: string): string {
		return `case-tasks-${section}-grp-${sanitizeTaskGroupDomIdPart(groupKey)}`;
	}

	function isTaskGroupCollapsed(section: string, groupKey: string): boolean {
		return collapsedTaskGroupKeys.has(`${section}|${groupKey}`);
	}

	function toggleTaskGroupCollapse(section: string, groupKey: string): void {
		const id = `${section}|${groupKey}`;
		const next = new Set(collapsedTaskGroupKeys);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		collapsedTaskGroupKeys = next;
	}

	function onTaskGroupToggleKeydown(e: KeyboardEvent, section: string, groupKey: string): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleTaskGroupCollapse(section, groupKey);
		}
	}

	function taskGroupCollapseAriaLabel(
		section: 'open' | 'completed' | 'archived' | 'deleted',
		groupKey: string,
		label: string
	): string {
		const verb = isTaskGroupCollapsed(section, groupKey) ? 'Expand' : 'Collapse';
		const scope = section === 'deleted' ? 'soft-deleted task group' : 'task group';
		return `${verb} ${scope}: ${label}`;
	}

	function onTaskSortFieldChange(e: Event): void {
		const v = (e.currentTarget as HTMLSelectElement).value as CaseTaskSortField;
		listSortMode = caseTaskListSortModeFromFieldAndPairIndex(v, 0);
	}

	function setSortPairIndex(index: 0 | 1): void {
		const field = caseTaskSortFieldFromListSortMode(listSortMode);
		listSortMode = caseTaskListSortModeFromFieldAndPairIndex(field, index);
	}

	function applySortPreset(mode: CaseTaskListSortMode): void {
		listSortMode = mode;
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

	/** P93-04: Toggle pin via Case Engine PATCH only — does not reorder or regroup client-side. */
	async function toggleTaskPin(task: CaseTask): Promise<void> {
		if (task.deletedAt) return;
		const tok = get(caseEngineToken);
		if (!caseId || !tok) {
			actionError = 'Case Engine session not available.';
			return;
		}
		clearActionError();
		mutationBusy = true;
		try {
			const row = await caseTasksApi.patchCaseTaskContent(caseId, task.id, tok, {
				pinned: !Boolean(task.pinned)
			});
			tasks = replaceTaskInList(tasks, caseEngineTaskToCaseTask(row));
		} catch (e) {
			actionError = e instanceof Error ? e.message : 'Pin update failed';
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

	function clearBulkSelection(): void {
		selectedTaskIds = new Set();
	}

	function toggleTaskSelection(task: CaseTask, checked: boolean): void {
		const next = new Set(selectedTaskIds);
		const isDel = Boolean(task.deletedAt);
		if (checked) {
			if (isDel) {
				for (const id of next) {
					const row = tasks.find((x) => x.id === id);
					if (row && !row.deletedAt) next.delete(id);
				}
			} else {
				for (const id of next) {
					const row = tasks.find((x) => x.id === id);
					if (row?.deletedAt) next.delete(id);
				}
			}
			next.add(task.id);
		} else {
			next.delete(task.id);
		}
		selectedTaskIds = next;
	}

	function selectAllVisibleActiveTasks(): void {
		selectedTaskIds = new Set([
			...openTasks.map((t) => t.id),
			...completedTasks.map((t) => t.id),
			...archivedTasks.map((t) => t.id)
		]);
	}

	function selectAllVisibleDeletedTasks(): void {
		selectedTaskIds = new Set(
			deletedTasksSorted.filter((t) => caseTaskBulkRestoreEligible(t)).map((t) => t.id)
		);
	}

	async function bulkCompleteSelected(): Promise<void> {
		if (!canBulkCompleteAll) return;
		const tok = get(caseEngineToken);
		if (!caseId || !tok) return;
		const ids = [...selectedTaskIds];
		clearActionError();
		mutationBusy = true;
		const failed: string[] = [];
		try {
			for (const id of ids) {
				try {
					const row = await caseTasksApi.postCaseTaskComplete(caseId, id, tok);
					tasks = replaceTaskInList(tasks, caseEngineTaskToCaseTask(row));
				} catch {
					failed.push(id);
				}
			}
			if (failed.length === 0) {
				selectedTaskIds = new Set();
			} else {
				selectedTaskIds = new Set(failed);
				actionError = `Could not complete ${failed.length} of ${ids.length} task(s). Selection kept for those rows.`;
			}
		} finally {
			mutationBusy = false;
		}
	}

	async function bulkArchiveSelected(): Promise<void> {
		if (!canBulkArchiveAll) return;
		const tok = get(caseEngineToken);
		if (!caseId || !tok) return;
		const ids = [...selectedTaskIds];
		clearActionError();
		mutationBusy = true;
		const failed: string[] = [];
		try {
			for (const id of ids) {
				try {
					const row = await caseTasksApi.postCaseTaskArchive(caseId, id, tok);
					tasks = replaceTaskInList(tasks, caseEngineTaskToCaseTask(row));
				} catch {
					failed.push(id);
				}
			}
			if (failed.length === 0) {
				selectedTaskIds = new Set();
			} else {
				selectedTaskIds = new Set(failed);
				actionError = `Could not archive ${failed.length} of ${ids.length} task(s). Selection kept for those rows.`;
			}
		} finally {
			mutationBusy = false;
		}
	}

	async function bulkRestoreSelected(): Promise<void> {
		if (!canBulkRestoreAll) return;
		const tok = get(caseEngineToken);
		if (!caseId || !tok) return;
		const ids = [...selectedTaskIds];
		clearActionError();
		mutationBusy = true;
		const failed: string[] = [];
		try {
			for (const id of ids) {
				try {
					const row = await caseTasksApi.postCaseTaskRestore(caseId, id, tok);
					tasks = replaceTaskInList(tasks, caseEngineTaskToCaseTask(row));
				} catch {
					failed.push(id);
				}
			}
			if (failed.length === 0) {
				selectedTaskIds = new Set();
			} else {
				selectedTaskIds = new Set(failed);
				actionError = `Could not restore ${failed.length} of ${ids.length} task(s). Selection kept for those rows.`;
			}
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
			Follow-up work — operational only. Not the official Timeline; use Timeline for the committed chronological
			record.
		</p>
	</header>

	<CaseArrivalOrientationBlock context={p99ArrivalSnapshot} testId="case-tasks-p99-arrival" />

	<div class="ce-l-tasks-workspace flex flex-col flex-1 min-h-0 min-w-0 p-3 sm:p-4">
		<div
			class="{DS_PANEL_CLASSES.muted} mb-4 shrink-0"
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

		<div class="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
			<h3
				class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
				data-testid="case-tasks-workspace-section-heading"
			>
				Tasks for this case
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
				class="mb-3 shrink-0 flex flex-wrap gap-3 items-end"
				data-testid="case-tasks-search-row"
			>
				<label class="flex flex-col gap-1 flex-1 min-w-[12rem] max-w-xl">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]">Search</span>
					<div class="flex flex-wrap items-center gap-2">
						<input
							type="search"
							bind:value={taskSearchInputRaw}
							on:input={handleTaskSearchInput}
							class="min-w-0 flex-1 rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
							placeholder="Title, description, group, or assignee"
							data-testid="case-tasks-search-input"
							autocomplete="off"
							aria-label="Search tasks by title, description, group label, or assignee display name"
						/>
						<button
							type="button"
							class="{DS_BTN_CLASSES.ghost} shrink-0 text-lg leading-none px-2"
							data-testid="case-tasks-search-clear"
							aria-label="Clear search"
							on:click={clearTaskSearchImmediate}
						>
							×
						</button>
					</div>
				</label>
				{#if taskSearchQuery}
					<span
						class="{DS_TYPE_CLASSES.meta} text-xs text-[color:var(--ce-l-text-secondary)] self-end pb-1"
						data-testid="case-tasks-search-active"
					>
						Filtering this list
					</span>
				{/if}
			</div>
			<div
				class="ce-l-tasks-filters mb-3 shrink-0 flex flex-wrap gap-3 items-end rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] px-3 py-2.5"
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
				<label class="flex flex-col gap-1 min-w-[10rem]">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]">Assignee</span>
					<select
						bind:value={filterAssigneeUserId}
						class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)] max-w-[14rem]"
						data-testid="case-tasks-filter-assignee"
						aria-label="Filter tasks by assignee"
					>
						<option value="">All assignees</option>
						<option value={CASE_TASK_FILTER_UNASSIGNED}>Unassigned</option>
						{#each assignableUsers as u (u.id)}
							<option value={u.id}>{u.name}</option>
						{/each}
					</select>
				</label>
				<label class="flex flex-col gap-1 min-w-[9rem]">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]">Due</span>
					<select
						bind:value={filterDueStatus}
						class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
						data-testid="case-tasks-filter-due"
						aria-label="Filter tasks by due date status"
					>
						<option value="">Any</option>
						<option value="OVERDUE">Overdue</option>
						<option value="HAS_DUE">Has due date</option>
						<option value="NO_DUE">No due date</option>
					</select>
				</label>
				<div
					class="flex flex-col gap-1 min-w-[11rem]"
					data-testid="case-tasks-filter-priority-group"
					role="group"
					aria-label="Filter by priority"
				>
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]">Priority</span>
					<div class="flex flex-wrap gap-2 items-center">
						<label class="flex items-center gap-1.5 cursor-pointer select-none">
							<input
								type="checkbox"
								class="rounded border-[color:var(--ce-l-chrome-border)]"
								bind:checked={filterPriorityLow}
								data-testid="case-tasks-filter-priority-low"
							/>
							<span class="{DS_TYPE_CLASSES.body} text-xs text-[color:var(--ce-l-text-secondary)]">Low</span>
						</label>
						<label class="flex items-center gap-1.5 cursor-pointer select-none">
							<input
								type="checkbox"
								class="rounded border-[color:var(--ce-l-chrome-border)]"
								bind:checked={filterPriorityMedium}
								data-testid="case-tasks-filter-priority-medium"
							/>
							<span class="{DS_TYPE_CLASSES.body} text-xs text-[color:var(--ce-l-text-secondary)]">Med</span>
						</label>
						<label class="flex items-center gap-1.5 cursor-pointer select-none">
							<input
								type="checkbox"
								class="rounded border-[color:var(--ce-l-chrome-border)]"
								bind:checked={filterPriorityHigh}
								data-testid="case-tasks-filter-priority-high"
							/>
							<span class="{DS_TYPE_CLASSES.body} text-xs text-[color:var(--ce-l-text-secondary)]">High</span>
						</label>
					</div>
				</div>
				<label class="flex flex-col gap-1 min-w-[10rem] max-w-[16rem]">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]">Group</span>
					<select
						bind:value={filterGroupLabel}
						class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)]"
						data-testid="case-tasks-filter-group"
						aria-label="Filter tasks by group label"
					>
						<option value="">Any group</option>
						{#each distinctGroupLabels as gl (gl)}
							<option value={gl}>{gl}</option>
						{/each}
					</select>
				</label>
				<div
					class="flex flex-col gap-2 min-w-[12rem] max-w-[24rem] shrink-0"
					data-testid="case-tasks-sort-controls"
				>
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
						>Sort list</span
					>
					<div class="flex flex-wrap gap-2 items-end">
						<label class="flex flex-col gap-1 min-w-[9rem]">
							<span class="{DS_TYPE_CLASSES.label} text-[10px] text-[color:var(--ce-l-text-muted)]"
								>Field</span
							>
							<select
								value={sortFieldUi}
								class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)] max-w-[12rem]"
								data-testid="case-tasks-sort-field"
								aria-label="Sort by field (operational list; not Timeline ordering)"
								on:change={onTaskSortFieldChange}
							>
								<option value="created">Created</option>
								<option value="due">Due date</option>
								<option value="priority">Priority</option>
								<option value="group_label">Group label</option>
							</select>
						</label>
						<div
							class="inline-flex rounded-md border border-[color:var(--ce-l-chrome-border)] p-0.5 bg-[color:var(--ce-l-canvas)]"
							data-testid="case-tasks-sort-direction"
							role="group"
							aria-label="Sort direction for selected field"
						>
							<button
								type="button"
								class="rounded px-2 py-1 text-xs max-w-[7.5rem] leading-tight {sortPairIndexUi === 0
									? 'bg-[color:var(--ce-l-chrome)] font-medium text-[color:var(--ce-l-text-primary)]'
									: 'text-[color:var(--ce-l-text-secondary)]'}"
								data-testid="case-tasks-sort-dir-0"
								aria-pressed={sortPairIndexUi === 0}
								aria-label="Sort direction: {sortPairLabels[0]}"
								on:click={() => setSortPairIndex(0)}
							>
								{sortPairLabels[0]}
							</button>
							<button
								type="button"
								class="rounded px-2 py-1 text-xs max-w-[7.5rem] leading-tight {sortPairIndexUi === 1
									? 'bg-[color:var(--ce-l-chrome)] font-medium text-[color:var(--ce-l-text-primary)]'
									: 'text-[color:var(--ce-l-text-secondary)]'}"
								data-testid="case-tasks-sort-dir-1"
								aria-pressed={sortPairIndexUi === 1}
								aria-label="Sort direction: {sortPairLabels[1]}"
								on:click={() => setSortPairIndex(1)}
							>
								{sortPairLabels[1]}
							</button>
						</div>
					</div>
					<div
						class="flex flex-wrap items-center gap-2"
						data-testid="case-tasks-sort-presets"
						role="group"
						aria-label="Quick sort presets"
					>
						<span class="{DS_TYPE_CLASSES.label} text-[10px] text-[color:var(--ce-l-text-muted)] shrink-0"
							>Quick</span
						>
						<button
							type="button"
							class="{DS_BTN_CLASSES.ghost} text-xs px-2 py-1"
							data-testid="case-tasks-sort-preset-due-soon"
							on:click={() => applySortPreset(CASE_TASK_SORT_QUICK_PRESET.dueSoon)}
						>
							Due soon
						</button>
						<button
							type="button"
							class="{DS_BTN_CLASSES.ghost} text-xs px-2 py-1"
							data-testid="case-tasks-sort-preset-high-priority"
							on:click={() => applySortPreset(CASE_TASK_SORT_QUICK_PRESET.highPriorityFirst)}
						>
							High priority first
						</button>
						<button
							type="button"
							class="{DS_BTN_CLASSES.ghost} text-xs px-2 py-1"
							data-testid="case-tasks-sort-preset-recent-created"
							on:click={() => applySortPreset(CASE_TASK_SORT_QUICK_PRESET.recentlyCreated)}
						>
							Recently created
						</button>
					</div>
					<p
						class="{DS_TYPE_CLASSES.meta} text-xs text-[color:var(--ce-l-text-primary)] m-0"
						data-testid="case-tasks-sort-active-summary"
						aria-live="polite"
					>
						Current: {sortActiveSummary}
					</p>
					<span
						class="{DS_TYPE_CLASSES.meta} text-[10px] leading-tight text-[color:var(--ce-l-text-muted)] max-w-[20rem]"
						data-testid="case-tasks-sort-hint"
					>
						Sort orders this list for scanning only — not scheduling, SLA, workflow, or Timeline.
					</span>
				</div>
				<label class="flex flex-col gap-1 min-w-[10rem]">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]"
						>Group by</span
					>
					<select
						bind:value={taskGroupByMode}
						class="rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] px-2 py-1.5 text-sm text-[color:var(--ce-l-text-primary)] max-w-[14rem]"
						data-testid="case-tasks-group-by"
						aria-label="Group tasks visually in this panel (not persisted)"
						on:change={() => {
							collapsedTaskGroupKeys = new Set();
						}}
					>
						<option value="none">None</option>
						<option value="group_label">Group label</option>
						<option value="priority">Priority</option>
					</select>
					<span
						class="{DS_TYPE_CLASSES.meta} text-[10px] leading-tight text-[color:var(--ce-l-text-muted)] max-w-[14rem]"
						data-testid="case-tasks-group-by-hint"
					>
						View only — not persisted
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
				<div
					class="flex flex-col gap-1 min-w-[11rem]"
					data-testid="case-tasks-density-toggle"
					role="group"
					aria-label="Task list density"
				>
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)]">View</span>
					<div
						class="inline-flex rounded-md border border-[color:var(--ce-l-chrome-border)] p-0.5 bg-[color:var(--ce-l-canvas)]"
					>
						<button
							type="button"
							class="rounded px-2 py-1 text-xs {taskDensityMode === 'expanded'
								? 'bg-[color:var(--ce-l-chrome)] font-medium text-[color:var(--ce-l-text-primary)]'
								: 'text-[color:var(--ce-l-text-secondary)]'}"
							data-testid="case-tasks-density-expanded"
							aria-pressed={taskDensityMode === 'expanded'}
							on:click={() => (taskDensityMode = 'expanded')}
						>
							Expanded
						</button>
						<button
							type="button"
							class="rounded px-2 py-1 text-xs {taskDensityMode === 'compact'
								? 'bg-[color:var(--ce-l-chrome)] font-medium text-[color:var(--ce-l-text-primary)]'
								: 'text-[color:var(--ce-l-text-secondary)]'}"
							data-testid="case-tasks-density-compact"
							aria-pressed={taskDensityMode === 'compact'}
							on:click={() => (taskDensityMode = 'compact')}
						>
							Compact
						</button>
					</div>
				</div>
				<div class="flex flex-col gap-1 min-w-[8rem] justify-end pb-0.5">
					<span class="{DS_TYPE_CLASSES.label} text-xs text-[color:var(--ce-l-text-secondary)] opacity-0 pointer-events-none"
						>Reset</span
					>
					<button
						type="button"
						class="{DS_BTN_CLASSES.secondary} text-xs"
						data-testid="case-tasks-clear-filters"
						on:click={clearAllFilters}
					>
						Clear filters
					</button>
				</div>
			</div>
			{#if visibleActiveTaskCount > 0}
				<div
					class="mb-2 flex flex-wrap items-center gap-2"
					data-testid="case-tasks-bulk-active-toolbar"
				>
					<button
						type="button"
						class="{DS_BTN_CLASSES.ghost} text-xs"
						data-testid="case-tasks-bulk-select-visible-active"
						disabled={mutationBusy}
						on:click={selectAllVisibleActiveTasks}
					>
						Select visible in list
					</button>
					<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)] max-w-[22rem]">
						Selects tasks shown in Open, Completed, and Archived below (not removed rows).
					</span>
				</div>
			{/if}
			{#if selectedTaskIds.size > 0}
				<div
					class="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] px-3 py-2"
					data-testid="case-tasks-bulk-bar"
					role="region"
					aria-label="Bulk actions on selected tasks"
				>
					<span
						class="{DS_TYPE_CLASSES.body} text-xs text-[color:var(--ce-l-text-secondary)]"
						data-testid="case-tasks-bulk-count"
					>
						{selectedTaskIds.size} selected
					</span>
					{#if bulkKind === 'mixed'}
						<p
							class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)] max-w-[22rem]"
							data-testid="case-tasks-bulk-mixed-hint"
						>
							Select only active tasks or only removed tasks — not both.
						</p>
					{:else if bulkKind === 'active'}
						<button
							type="button"
							class="{DS_BTN_CLASSES.secondary} text-xs"
							data-testid="case-tasks-bulk-complete"
							disabled={!canBulkCompleteAll || mutationBusy}
							on:click={() => void bulkCompleteSelected()}
						>
							Mark complete
						</button>
						<button
							type="button"
							class="{DS_BTN_CLASSES.secondary} text-xs"
							data-testid="case-tasks-bulk-archive"
							disabled={!canBulkArchiveAll || mutationBusy}
							on:click={() => void bulkArchiveSelected()}
						>
							Archive
						</button>
					{:else if bulkKind === 'deleted'}
						<button
							type="button"
							class="{DS_BTN_CLASSES.secondary} text-xs"
							data-testid="case-tasks-bulk-restore"
							disabled={!canBulkRestoreAll || mutationBusy}
							on:click={() => void bulkRestoreSelected()}
						>
							Restore removed
						</button>
					{/if}
					<button
						type="button"
						class="{DS_BTN_CLASSES.ghost} text-xs"
						data-testid="case-tasks-bulk-clear"
						disabled={mutationBusy}
						on:click={clearBulkSelection}
					>
						Clear selection
					</button>
				</div>
			{/if}
		{/if}

		{#if synthesisRevealBanner === 'not_found'}
			<div
				class="mb-3 rounded-md border border-amber-200 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
				role="status"
				data-testid="synthesis-tasks-reveal-not-found"
			>
				This task is not in the current list. It may be filtered out, not loaded yet, or not visible in the
				current section. Adjust filters if needed—operational tasks are supporting only; they are not Timeline
				entries.
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
					No tasks in this case yet
				</p>
				<p class="{DS_TYPE_CLASSES.body} m-0 max-w-md text-sm text-[color:var(--ce-l-text-secondary)]">
					Add a task when you need operational tracking. Not part of the official Timeline.
				</p>
			</div>
		{/if}

		{#if activeTasks.length > 0 && filteredTasks.length === 0}
			<div
				class="{DS_CASE_TASKS_CLASSES.emptyShell} flex flex-col flex-1 min-h-[10rem] items-center justify-center gap-2 rounded-md border border-dashed border-[color:var(--ce-l-chrome-border)] px-4 py-8 text-center"
				data-testid="case-tasks-filter-empty"
			>
				<p class="{DS_TYPE_CLASSES.panel} m-0 font-medium text-[color:var(--ce-l-text-primary)]">
					No tasks match your search or filters
				</p>
				<p
					class="{DS_TYPE_CLASSES.body} m-0 max-w-md text-sm text-[color:var(--ce-l-text-secondary)]"
					data-testid="case-tasks-filter-empty-hint"
				>
					Clear search or use Clear filters to widen the list. Operational tasks only — not Timeline entries.
				</p>
			</div>
		{:else if tasks.length > 0}
			<div
				class="flex flex-col flex-1 min-h-0 overflow-y-auto {taskMainListGap}"
				data-testid="case-tasks-list"
				data-task-density={taskDensityMode}
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
							{CASE_TASK_SECTION_HINT}
						</p>
					</div>
					{#if openTasks.length === 0}
						<div class="flex flex-col gap-1" data-testid="case-tasks-no-open">
							<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]">
								{#if taskPanelHasNarrowingFilters}
									No open tasks match the current search or filters.
								{:else}
									No open tasks.
								{/if}
							</p>
							{#if taskPanelHasNarrowingFilters}
								<p
									class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
									data-testid="case-tasks-no-open-narrowing-note"
								>
									Other lifecycle sections may still list tasks.
								</p>
							{/if}
						</div>
					{:else}
						<div
							class="{taskGroupByMode === 'none' ? 'contents' : 'flex flex-col gap-3 min-w-0'}"
							data-testid="case-tasks-open-groups-wrap"
						>
							{#each openTaskDisplayGroups as grp (grp.key)}
								<div
									class="{taskGroupByMode === 'none' ? 'contents' : 'flex flex-col gap-2 min-w-0'}"
									data-testid={taskGroupByMode === 'none' ? undefined : 'case-tasks-visual-group'}
									data-task-group-section="open"
									data-group-key={grp.key}
								>
									{#if taskGroupByMode !== 'none'}
										<div class="flex flex-wrap items-center gap-2">
											<button
												type="button"
												class="{DS_BTN_CLASSES.ghost} text-xs shrink-0"
												data-testid="case-tasks-visual-group-toggle"
												data-task-group-section="open"
												data-group-key={grp.key}
												aria-expanded={!isTaskGroupCollapsed('open', grp.key)}
												aria-controls={taskGroupPanelId('open', grp.key)}
												aria-label={taskGroupCollapseAriaLabel('open', grp.key, grp.label)}
												on:click={() => toggleTaskGroupCollapse('open', grp.key)}
												on:keydown={(e) => onTaskGroupToggleKeydown(e, 'open', grp.key)}
											>
												{isTaskGroupCollapsed('open', grp.key) ? '▶' : '▼'}
											</button>
											<span
												class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-primary)]"
												>{grp.label}</span
											>
											<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
												>({grp.tasks.length})</span
											>
										</div>
									{/if}
									{#if taskGroupByMode === 'none' || !isTaskGroupCollapsed('open', grp.key)}
										<ul
											id={taskGroupPanelId('open', grp.key)}
											class="task-list flex flex-col list-none m-0 p-0 {taskListGap} {taskDensityMode === 'compact'
												? 'task-list--compact'
												: 'task-list--expanded'}"
										>
											{#each grp.tasks as task (task.id)}
								<li
									id={`ce-case-task-${task.id}`}
									class="ce-task-row rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-canvas)] {taskRowPad} {taskRowDensityClass}{synthesisHighlightId === task.id
										? ' ds-p97-synthesis-nav-reveal'
										: ''}"
									data-testid="case-tasks-item"
									data-task-id={task.id}
									data-task-status="open"
									data-task-expanded={expandedTaskIds.has(task.id) ? 'true' : 'false'}
									data-task-density={taskDensityMode}
								>
									{#if synthesisHighlightId === task.id && synthesisContextPreview}
										<SynthesisNavigationContextPreview
											role="supporting"
											surface="tasks"
											headline={synthesisContextPreview.headline}
											lines={synthesisContextPreview.lines}
										/>
									{/if}
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
											<div class="flex flex-col gap-1 items-center shrink-0 pt-0.5">
												<input
													type="checkbox"
													class="mt-0.5 rounded border-[color:var(--ce-l-chrome-border)]"
													checked={selectedTaskIds.has(task.id)}
													disabled={mutationBusy}
													data-testid="case-tasks-row-select"
													data-task-id={task.id}
													aria-label="Select task for bulk actions"
													on:change={(e) =>
														toggleTaskSelection(task, (e.currentTarget as HTMLInputElement).checked)}
												/>
												{#if !task.deletedAt}
													<CaseTaskPinToggle
														pinned={Boolean(task.pinned)}
														disabled={mutationBusy}
														taskId={task.id}
														onToggle={() => void toggleTaskPin(task)}
													/>
												{/if}
											</div>
											<div class="{taskRowPrimaryStackClass}">
												<div class="flex flex-wrap items-start gap-2 justify-between">
													<p
														class="task-row-title {DS_TYPE_CLASSES.panel} m-0 {taskTitleSizeClass} {taskTitleLeadClass} text-[color:var(--ce-l-text-primary)] flex items-start gap-1.5 min-w-0 {taskTitleClamp} {taskTitleOverflowClass}"
													>
														{#if task.pinned}
															<CaseTaskPinnedGlyph />
														{/if}
														<span class="min-w-0">{task.title}</span>
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
												{#if task.description?.trim() && !caseTaskShouldOfferDetailToggle(task)}
													<p
														class="{taskDescPreviewBaseClass} text-[color:var(--ce-l-text-secondary)] {taskDescClampInline}"
														data-testid="case-tasks-row-desc-preview"
													>
														{task.description}
													</p>
												{/if}
												{#if caseTaskShouldOfferDetailToggle(task) && !expandedTaskIds.has(task.id) && task.description?.trim()}
													<p
														class="{taskDescPreviewBaseClass} text-[color:var(--ce-l-text-secondary)] {taskDescClampCollapsed}"
														data-testid="case-tasks-row-desc-preview"
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
																class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-secondary)] whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
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
														<TasksDeclaredRelationshipsBlock {caseId} {task} />
														<CaseTaskCrossRefsSection
															{caseId}
															{task}
															linksReadOnly={Boolean(task.deletedAt)}
															onRefresh={() => void loadTasks()}
														/>
													</div>
												{/if}
												<p
													class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
													data-testid="case-tasks-row-created-line"
												>
													{formatCreatedAt(task.createdAt)} · {task.createdBy}
												</p>
												<TaskOperationalRowMeta
													{task}
													{assignableUsers}
													density={taskDensityMode}
													scanSection="active"
												/>
												<CaseTaskRowContextSignals {task} />
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
								</div>
							{/each}
						</div>
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
							{CASE_TASK_SECTION_HINT}
						</p>
					</div>
					{#if completedTasks.length === 0}
						<div class="flex flex-col gap-1" data-testid="case-tasks-no-completed">
							<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]">
								{#if taskPanelHasNarrowingFilters}
									No completed tasks match the current search or filters.
								{:else}
									No completed tasks.
								{/if}
							</p>
							{#if taskPanelHasNarrowingFilters}
								<p
									class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
									data-testid="case-tasks-no-completed-narrowing-note"
								>
									Other lifecycle sections may still list tasks.
								</p>
							{/if}
						</div>
					{:else}
						<div
							class="{taskGroupByMode === 'none' ? 'contents' : 'flex flex-col gap-3 min-w-0'}"
							data-testid="case-tasks-completed-groups-wrap"
						>
							{#each completedTaskDisplayGroups as grp (grp.key)}
								<div
									class="{taskGroupByMode === 'none' ? 'contents' : 'flex flex-col gap-2 min-w-0'}"
									data-testid={taskGroupByMode === 'none' ? undefined : 'case-tasks-visual-group'}
									data-task-group-section="completed"
									data-group-key={grp.key}
								>
									{#if taskGroupByMode !== 'none'}
										<div class="flex flex-wrap items-center gap-2">
											<button
												type="button"
												class="{DS_BTN_CLASSES.ghost} text-xs shrink-0"
												data-testid="case-tasks-visual-group-toggle"
												data-task-group-section="completed"
												data-group-key={grp.key}
												aria-expanded={!isTaskGroupCollapsed('completed', grp.key)}
												aria-controls={taskGroupPanelId('completed', grp.key)}
												aria-label={taskGroupCollapseAriaLabel('completed', grp.key, grp.label)}
												on:click={() => toggleTaskGroupCollapse('completed', grp.key)}
												on:keydown={(e) => onTaskGroupToggleKeydown(e, 'completed', grp.key)}
											>
												{isTaskGroupCollapsed('completed', grp.key) ? '▶' : '▼'}
											</button>
											<span
												class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-muted)]"
												>{grp.label}</span
											>
											<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
												>({grp.tasks.length})</span
											>
										</div>
									{/if}
									{#if taskGroupByMode === 'none' || !isTaskGroupCollapsed('completed', grp.key)}
										<ul
											id={taskGroupPanelId('completed', grp.key)}
											class="task-list flex flex-col list-none m-0 p-0 {taskListGap} {taskDensityMode === 'compact'
												? 'task-list--compact'
												: 'task-list--expanded'}"
										>
											{#each grp.tasks as task (task.id)}
								{@const completionAttr = formatCaseTaskCompletionAttribution(task)}
								<li
									id={`ce-case-task-${task.id}`}
									class="ce-task-row rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] {taskRowPad} opacity-90 {taskRowDensityClass}{synthesisHighlightId === task.id
										? ' ds-p97-synthesis-nav-reveal'
										: ''}"
									data-testid="case-tasks-item"
									data-task-id={task.id}
									data-task-status="completed"
									data-task-expanded={expandedTaskIds.has(task.id) ? 'true' : 'false'}
									data-task-density={taskDensityMode}
								>
									{#if synthesisHighlightId === task.id && synthesisContextPreview}
										<SynthesisNavigationContextPreview
											role="supporting"
											surface="tasks"
											headline={synthesisContextPreview.headline}
											lines={synthesisContextPreview.lines}
										/>
									{/if}
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
											<div class="flex flex-col gap-1 items-center shrink-0 pt-0.5">
												<input
													type="checkbox"
													class="mt-0.5 rounded border-[color:var(--ce-l-chrome-border)]"
													checked={selectedTaskIds.has(task.id)}
													disabled={mutationBusy}
													data-testid="case-tasks-row-select"
													data-task-id={task.id}
													aria-label="Select task for bulk actions"
													on:change={(e) =>
														toggleTaskSelection(task, (e.currentTarget as HTMLInputElement).checked)}
												/>
												{#if !task.deletedAt}
													<CaseTaskPinToggle
														pinned={Boolean(task.pinned)}
														disabled={mutationBusy}
														taskId={task.id}
														onToggle={() => void toggleTaskPin(task)}
													/>
												{/if}
											</div>
											<div class="{taskRowPrimaryStackClass}">
												<div class="flex flex-wrap items-start gap-2 justify-between">
													<p
														class="task-row-title {DS_TYPE_CLASSES.panel} m-0 {taskTitleSizeClass} {taskTitleLeadClass} text-[color:var(--ce-l-text-muted)] line-through flex items-start gap-1.5 min-w-0 {taskTitleClamp} {taskTitleOverflowClass}"
													>
														{#if task.pinned}
															<CaseTaskPinnedGlyph />
														{/if}
														<span class="min-w-0">{task.title}</span>
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
												{#if task.description?.trim() && !caseTaskShouldOfferDetailToggle(task)}
													<p
														class="{taskDescPreviewBaseClass} text-[color:var(--ce-l-text-muted)] {taskDescClampInline}"
														data-testid="case-tasks-row-desc-preview"
													>
														{task.description}
													</p>
												{/if}
												{#if caseTaskShouldOfferDetailToggle(task) && !expandedTaskIds.has(task.id) && task.description?.trim()}
													<p
														class="{taskDescPreviewBaseClass} text-[color:var(--ce-l-text-muted)] {taskDescClampCollapsed}"
														data-testid="case-tasks-row-desc-preview"
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
																class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)] whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
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
														<TasksDeclaredRelationshipsBlock {caseId} {task} />
														<CaseTaskCrossRefsSection
															{caseId}
															{task}
															linksReadOnly={Boolean(task.deletedAt)}
															onRefresh={() => void loadTasks()}
														/>
													</div>
												{/if}
												<p
													class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
													data-testid="case-tasks-row-created-line"
												>
													{formatCreatedAt(task.createdAt)} · {task.createdBy}
												</p>
												<TaskOperationalRowMeta
													{task}
													{assignableUsers}
													density={taskDensityMode}
													scanSection="inactive"
												/>
												<CaseTaskRowContextSignals {task} />
												{#if completionAttr}
													<p
														class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
														data-testid="case-tasks-completion-attribution"
													>
														{completionAttr}
													</p>
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
								</div>
							{/each}
						</div>
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
						<p
							class="{DS_WORKFLOW_TEXT_CLASSES.embedCompactProse} m-0 text-[color:var(--ce-l-text-muted)]"
							data-testid="case-tasks-section-archived-hint"
						>
							{CASE_TASK_SECTION_HINT}
						</p>
					</div>
					{#if archivedTasks.length === 0}
						<div class="flex flex-col gap-1" data-testid="case-tasks-no-archived">
							<p class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)]">
								{#if taskPanelHasNarrowingFilters}
									No archived tasks match the current search or filters.
								{:else}
									No archived tasks.
								{/if}
							</p>
							{#if taskPanelHasNarrowingFilters}
								<p
									class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
									data-testid="case-tasks-no-archived-narrowing-note"
								>
									Other lifecycle sections may still list tasks.
								</p>
							{/if}
						</div>
					{:else}
						<div
							class="{taskGroupByMode === 'none' ? 'contents' : 'flex flex-col gap-3 min-w-0'}"
							data-testid="case-tasks-archived-groups-wrap"
						>
							{#each archivedTaskDisplayGroups as grp (grp.key)}
								<div
									class="{taskGroupByMode === 'none' ? 'contents' : 'flex flex-col gap-2 min-w-0'}"
									data-testid={taskGroupByMode === 'none' ? undefined : 'case-tasks-visual-group'}
									data-task-group-section="archived"
									data-group-key={grp.key}
								>
									{#if taskGroupByMode !== 'none'}
										<div class="flex flex-wrap items-center gap-2">
											<button
												type="button"
												class="{DS_BTN_CLASSES.ghost} text-xs shrink-0"
												data-testid="case-tasks-visual-group-toggle"
												data-task-group-section="archived"
												data-group-key={grp.key}
												aria-expanded={!isTaskGroupCollapsed('archived', grp.key)}
												aria-controls={taskGroupPanelId('archived', grp.key)}
												aria-label={taskGroupCollapseAriaLabel('archived', grp.key, grp.label)}
												on:click={() => toggleTaskGroupCollapse('archived', grp.key)}
												on:keydown={(e) => onTaskGroupToggleKeydown(e, 'archived', grp.key)}
											>
												{isTaskGroupCollapsed('archived', grp.key) ? '▶' : '▼'}
											</button>
											<span
												class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-muted)]"
												>{grp.label}</span
											>
											<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
												>({grp.tasks.length})</span
											>
										</div>
									{/if}
									{#if taskGroupByMode === 'none' || !isTaskGroupCollapsed('archived', grp.key)}
										<ul
											id={taskGroupPanelId('archived', grp.key)}
											class="task-list flex flex-col list-none m-0 p-0 {taskListGap} {taskDensityMode === 'compact'
												? 'task-list--compact'
												: 'task-list--expanded'}"
										>
											{#each grp.tasks as task (task.id)}
								{@const archiveAttr = formatCaseTaskArchiveAttribution(task)}
								<li
									id={`ce-case-task-${task.id}`}
									class="ce-task-row rounded-md border border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] {taskRowPad} opacity-80 {taskRowDensityClass}{synthesisHighlightId === task.id
										? ' ds-p97-synthesis-nav-reveal'
										: ''}"
									data-testid="case-tasks-item"
									data-task-id={task.id}
									data-task-status="archived"
									data-task-expanded={expandedTaskIds.has(task.id) ? 'true' : 'false'}
									data-task-density={taskDensityMode}
								>
									{#if synthesisHighlightId === task.id && synthesisContextPreview}
										<SynthesisNavigationContextPreview
											role="supporting"
											surface="tasks"
											headline={synthesisContextPreview.headline}
											lines={synthesisContextPreview.lines}
										/>
									{/if}
									<div class="flex flex-wrap items-start justify-between gap-2">
										<div class="flex flex-col gap-1 items-center shrink-0 pt-0.5">
											<input
												type="checkbox"
												class="mt-0.5 rounded border-[color:var(--ce-l-chrome-border)]"
												checked={selectedTaskIds.has(task.id)}
												disabled={mutationBusy}
												data-testid="case-tasks-row-select"
												data-task-id={task.id}
												aria-label="Select task for bulk actions"
												on:change={(e) =>
													toggleTaskSelection(task, (e.currentTarget as HTMLInputElement).checked)}
											/>
											{#if !task.deletedAt}
												<CaseTaskPinToggle
													pinned={Boolean(task.pinned)}
													disabled={mutationBusy}
													taskId={task.id}
													onToggle={() => void toggleTaskPin(task)}
												/>
											{/if}
										</div>
										<div class="{taskRowPrimaryStackClass}">
											<div class="flex flex-wrap items-start gap-2 justify-between">
												<p
													class="task-row-title {DS_TYPE_CLASSES.panel} m-0 {taskTitleSizeClass} {taskTitleLeadClass} text-[color:var(--ce-l-text-muted)] flex items-start gap-1.5 min-w-0 {taskTitleClamp} {taskTitleOverflowClass}"
												>
													{#if task.pinned}
														<CaseTaskPinnedGlyph />
													{/if}
													<span class="min-w-0">{task.title}</span>
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
											{#if task.description?.trim() && !caseTaskShouldOfferDetailToggle(task)}
												<p
													class="{taskDescPreviewBaseClass} text-[color:var(--ce-l-text-muted)] {taskDescClampInline}"
													data-testid="case-tasks-row-desc-preview"
												>
													{task.description}
												</p>
											{/if}
											{#if caseTaskShouldOfferDetailToggle(task) && !expandedTaskIds.has(task.id) && task.description?.trim()}
												<p
													class="{taskDescPreviewBaseClass} text-[color:var(--ce-l-text-muted)] {taskDescClampCollapsed}"
													data-testid="case-tasks-row-desc-preview"
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
															class="{DS_TYPE_CLASSES.body} m-0 text-sm text-[color:var(--ce-l-text-muted)] whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
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
													<TasksDeclaredRelationshipsBlock {caseId} {task} />
													<CaseTaskCrossRefsSection
														{caseId}
														{task}
														linksReadOnly={Boolean(task.deletedAt)}
														onRefresh={() => void loadTasks()}
													/>
												</div>
											{/if}
											<p
												class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
												data-testid="case-tasks-row-created-line"
											>
												{formatCreatedAt(task.createdAt)} · {task.createdBy}
											</p>
											<TaskOperationalRowMeta
												{task}
												{assignableUsers}
												density={taskDensityMode}
												scanSection="inactive"
											/>
											<CaseTaskRowContextSignals {task} />
											{#if archiveAttr}
												<p
													class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
													data-testid="case-tasks-archive-attribution"
												>
													{archiveAttr}
												</p>
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
								</div>
							{/each}
						</div>
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
						<div
							class="mb-2 flex flex-wrap items-center gap-2"
							data-testid="case-tasks-bulk-deleted-toolbar"
						>
							<button
								type="button"
								class="{DS_BTN_CLASSES.ghost} text-xs"
								data-testid="case-tasks-bulk-select-visible-deleted"
								disabled={mutationBusy}
								on:click={selectAllVisibleDeletedTasks}
							>
								Select visible removed
							</button>
							<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)] max-w-[22rem]">
								Selects soft-deleted rows shown below (not active tasks).
							</span>
						</div>
						<div
							class="{taskGroupByMode === 'none' ? 'contents' : 'flex flex-col gap-3 min-w-0'}"
							data-testid="case-tasks-deleted-groups-wrap"
						>
							{#each deletedTaskDisplayGroups as grp (grp.key)}
								<div
									class="{taskGroupByMode === 'none' ? 'contents' : 'flex flex-col gap-2 min-w-0'}"
									data-testid={taskGroupByMode === 'none' ? undefined : 'case-tasks-visual-group'}
									data-task-group-section="deleted"
									data-group-key={grp.key}
									data-visual-tier="soft-deleted"
								>
									{#if taskGroupByMode !== 'none'}
										<div
											class="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] px-2 py-1.5 opacity-90"
										>
											<button
												type="button"
												class="{DS_BTN_CLASSES.ghost} text-xs shrink-0"
												data-testid="case-tasks-visual-group-toggle"
												data-task-group-section="deleted"
												data-group-key={grp.key}
												aria-expanded={!isTaskGroupCollapsed('deleted', grp.key)}
												aria-controls={taskGroupPanelId('deleted', grp.key)}
												aria-label={taskGroupCollapseAriaLabel('deleted', grp.key, grp.label)}
												on:click={() => toggleTaskGroupCollapse('deleted', grp.key)}
												on:keydown={(e) => onTaskGroupToggleKeydown(e, 'deleted', grp.key)}
											>
												{isTaskGroupCollapsed('deleted', grp.key) ? '▶' : '▼'}
											</button>
											<span
												class="{DS_TYPE_CLASSES.panel} m-0 text-sm font-semibold text-[color:var(--ce-l-text-muted)]"
												>{grp.label}</span
											>
											<span class="{DS_TYPE_CLASSES.meta} text-[10px] text-[color:var(--ce-l-text-muted)]"
												>({grp.tasks.length})</span
											>
										</div>
									{/if}
									{#if taskGroupByMode === 'none' || !isTaskGroupCollapsed('deleted', grp.key)}
										<ul
											id={taskGroupPanelId('deleted', grp.key)}
											class="task-list flex flex-col list-none m-0 p-0 {taskListGap} {taskDensityMode === 'compact'
												? 'task-list--compact'
												: 'task-list--expanded'}"
										>
											{#each grp.tasks as task (task.id)}
								{@const delAttr = formatCaseTaskSoftDeleteAttribution(task)}
								<li
									id={`ce-case-task-${task.id}`}
									class="ce-task-row rounded-md border border-dashed border-[color:var(--ce-l-chrome-border)] bg-[color:var(--ce-l-chrome)] {taskRowPad} opacity-75 {taskRowDensityClass}{synthesisHighlightId === task.id
										? ' ds-p97-synthesis-nav-reveal'
										: ''}"
									data-testid="case-tasks-item-deleted"
									data-task-id={task.id}
									data-task-status="deleted"
									data-task-density={taskDensityMode}
								>
									{#if synthesisHighlightId === task.id && synthesisContextPreview}
										<SynthesisNavigationContextPreview
											role="supporting"
											surface="tasks"
											headline={synthesisContextPreview.headline}
											lines={synthesisContextPreview.lines}
										/>
									{/if}
									<div class="flex flex-wrap items-start gap-2">
										<div class="flex flex-col gap-1 items-center shrink-0 pt-0.5">
											<input
												type="checkbox"
												class="mt-0.5 rounded border-[color:var(--ce-l-chrome-border)]"
												checked={selectedTaskIds.has(task.id)}
												disabled={mutationBusy || !caseTaskBulkRestoreEligible(task)}
												data-testid="case-tasks-row-select-deleted"
												data-task-id={task.id}
												aria-label="Select removed task for bulk restore"
												on:change={(e) =>
													toggleTaskSelection(task, (e.currentTarget as HTMLInputElement).checked)}
											/>
										</div>
										<div class="{taskRowPrimaryStackClass}">
											<p
												class="task-row-title {DS_TYPE_CLASSES.panel} m-0 {taskTitleSizeClass} {taskTitleLeadClass} text-[color:var(--ce-l-text-muted)] flex items-start gap-1.5 min-w-0 {taskTitleClamp} {taskTitleOverflowClass}"
											>
												{#if task.pinned}
													<CaseTaskPinnedGlyph />
												{/if}
												<span class="min-w-0">{task.title}</span>
											</p>
											{#if task.description?.trim()}
												<p
													class="{taskDescPreviewBaseClass} text-[color:var(--ce-l-text-muted)] {taskDeletedDescClamp}"
													data-testid="case-tasks-row-desc-preview"
												>
													{task.description}
												</p>
											{/if}
											{#if delAttr}
												<p
													class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
													data-testid="case-tasks-deleted-attribution"
												>
													{delAttr}
												</p>
											{/if}
											<p
												class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]"
												data-testid="case-tasks-row-created-line"
											>
												{formatCreatedAt(task.createdAt)} · {task.createdBy}
											</p>
											<TaskOperationalRowMeta
												{task}
												{assignableUsers}
												density={taskDensityMode}
												scanSection="inactive"
											/>
											<CaseTaskRowContextSignals {task} />
											{#if task.linkedTimelineEntryId}
												<p class="{DS_TYPE_CLASSES.meta} m-0 text-xs text-[color:var(--ce-l-text-muted)]">
													Timeline entry (reference):
													<span class="{DS_TYPE_CLASSES.mono} break-all">{task.linkedTimelineEntryId}</span>
												</p>
											{/if}
											<TasksDeclaredRelationshipsBlock {caseId} {task} />
											{#if task.crossRefs.length > 0}
												<CaseTaskCrossRefsSection
													{caseId}
													{task}
													linksReadOnly={true}
													onRefresh={() => void loadTasks()}
												/>
											{/if}
										</div>
									</div>
								</li>
											{/each}
										</ul>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	/* P92-03: density mode markers — spacing/truncation via Tailwind + reactive class strings */
	:global(.task-row.task-row--expanded),
	:global(.task-row.task-row--compact) {
		min-width: 0;
	}

	/* P94-04: row hover — subtle inset ring only (not selection/activation) */
	:global(.ce-task-row) {
		transition:
			box-shadow 0.15s ease,
			background-color 0.15s ease;
	}
	:global(.ce-task-row:hover) {
		box-shadow: inset 0 0 0 1px var(--ce-l-border-default);
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.ce-task-row) {
			transition: none;
		}
	}

	/* P94-04: keyboard focus — complements .ds-btn :focus-visible; native controls in row */
	:global(.ce-task-row input[type='checkbox']:focus-visible) {
		outline: 2px solid var(--ce-l-border-strong);
		outline-offset: 2px;
	}
	:global(
		.ce-task-row input:focus-visible:not([type='checkbox']):not([type='hidden']):not([type='radio'])
	),
	:global(.ce-task-row textarea:focus-visible),
	:global(.ce-task-row select:focus-visible) {
		outline: 2px solid var(--ce-l-border-strong);
		outline-offset: 2px;
	}
</style>
