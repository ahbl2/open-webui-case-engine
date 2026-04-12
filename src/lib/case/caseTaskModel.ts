/**
 * P86 / P89-07: Operational Tasks model for Case Workspace UI.
 * P92-01 / P92-02: Client-side status → text search → multi-criteria pipeline (no API changes).
 * P93-01: Optional UI-only visual grouping (non-persistent; view-layer only; no data mutation).
 * Use {@link caseTaskGroupLabelStableKey} / {@link caseTaskPriorityStableKey} for stable group keys.
 * P93-02: Explicit sort field + direction UI and quick presets (maps to existing {@link sortCaseTasksForList} only).
 * P93-03: Scan cues (overdue / priority emphasis) — render-time only; no sort/group/filter/persistence changes.
 * P93-04: `pinned` — server-backed attention mark only; must not affect sort/group/filter client pipelines.
 * P89-07: When loaded from Case Engine, ids and fields reflect server `case_tasks` (authoritative for persisted rows).
 * Tasks are not Timeline entries — no `occurred_at`; optional `timeline_entry_id` is reference-only.
 * Must NOT directly or indirectly cause any mutation of timeline_entries from UI code paths.
 */
import type { CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';

/** UI lifecycle bucket (maps from engine OPEN | COMPLETED | ARCHIVED). */
export type CaseTaskStatus = 'open' | 'completed' | 'archived';

/** P90-01: Client-side list filter — all statuses or one lifecycle bucket. */
export type CaseTaskStatusFilter = 'all' | CaseTaskStatus;

/** P92-03: Task list row density in CaseTasksPanel (presentation only; session-only state). */
export type TaskDensityMode = 'expanded' | 'compact';

/** P93-01: UI-only grouping mode for CaseTasksPanel (non-persistent; not saved to storage). */
export type CaseTaskGroupByMode = 'none' | 'group_label' | 'priority';

/**
 * P93-03: List section for scan cues — **active** (open tasks) vs **inactive** (completed, archived, soft-deleted).
 * Inactive rows suppress overdue urgency styling.
 */
export type CaseTaskScanSection = 'active' | 'inactive';

/** P93-01: One collapsible bucket derived from an already-filtered/sorted task list (does not mutate tasks). */
export interface CaseTaskVisualGroup {
	key: string;
	label: string;
	tasks: CaseTask[];
}

/**
 * P90-02: Operational list order by task `createdAt` only (not Timeline / not occurred_at).
 * `newest` matches Case Engine list default (`created_at DESC, id ASC`).
 */
export type CaseTaskCreatedSortOrder = 'newest' | 'oldest';

/**
 * P91-02: Client-side list ordering — created time or optional due date (awareness only; not scheduling).
 */
export type CaseTaskListSortMode =
	| 'created_newest'
	| 'created_oldest'
	| 'due_soonest'
	| 'due_latest'
	| 'priority_high_first'
	| 'priority_low_first'
	| 'group_label_a_z'
	| 'group_label_z_a';

/**
 * P93-02: Runtime list of every {@link CaseTaskListSortMode} — **keep in sync with the type** (add/remove
 * entries when the union changes). Used for integrity tests against {@link CASE_TASK_SORT_FIELD_PAIR}.
 * New sort semantics require updating {@link CASE_TASK_SORT_FIELD_PAIR} and UI helpers, or an explicit
 * exclusion with documentation.
 */
export const CASE_TASK_LIST_SORT_MODES_ALL: readonly CaseTaskListSortMode[] = [
	'created_newest',
	'created_oldest',
	'due_soonest',
	'due_latest',
	'priority_high_first',
	'priority_low_first',
	'group_label_a_z',
	'group_label_z_a'
];

/** P92-05: same-case notebook / file pointer for navigation only (not Timeline). */
export interface CaseTaskCrossRef {
	id: string;
	linkedEntityType: 'note' | 'file';
	linkedEntityId: string;
	displayLabel: string | null;
	targetStatus: 'active' | 'unavailable';
	createdAt: string;
	createdBy: string;
}

export interface CaseTask {
	id: string;
	title: string;
	description?: string | null;
	createdAt: string;
	createdBy: string;
	updatedAt: string;
	status: CaseTaskStatus;
	/** Reference-only Timeline entry id (same semantics as engine `timeline_entry_id`). */
	linkedTimelineEntryId?: string | null;
	completedAt?: string | null;
	completedBy?: string | null;
	archivedAt?: string | null;
	archivedBy?: string | null;
	deletedAt?: string | null;
	deletedBy?: string | null;
	/** P91-01: optional assignee Case Engine `users.id` (operational tracking only). */
	assigneeUserId?: string | null;
	/** Server-resolved name for display (historical; not limited to active picker). */
	assigneeDisplayName?: string | null;
	/** P91-02: optional YYYY-MM-DD — awareness only; not Timeline / not reminders. */
	dueDate?: string | null;
	/** P91-03: `low` | `medium` | `high` — operator-set only; not escalation or routing. */
	priority?: string | null;
	/** P91-04: optional single grouping label — scanning and organization only; not workflow or stages. */
	groupLabel?: string | null;
	/** P93-04: operator attention pin — visibility only; not ordering, priority, or workflow. */
	pinned?: boolean;
	/** P92-05: read-only navigation pointers to same-case notes/files (from Case Engine). */
	crossRefs: CaseTaskCrossRef[];
}

/**
 * P94-03: Counts for inline row context (same-case note/file cross-refs only). Unknown types are ignored.
 */
export function caseTaskCrossRefCounts(task: CaseTask): { notes: number; files: number } {
	let notes = 0;
	let files = 0;
	for (const r of task.crossRefs) {
		if (r.linkedEntityType === 'note') notes++;
		else if (r.linkedEntityType === 'file') files++;
	}
	return { notes, files };
}

/** P91-04: Max length aligned with Case Engine `CASE_TASK_GROUP_LABEL_MAX` (trimmed text). */
export const CASE_TASK_GROUP_LABEL_MAX = 200;

/**
 * P91-03: Single source for allowed values, display labels, and sort rank (index in this array + 1).
 * Keep {@link formatCaseTaskPriorityLabel}, {@link sortCaseTasksByPriorityInner}, and {@link caseTaskScanPriorityCueLevel}
 * aligned. New engine values (e.g. `urgent`) require an explicit array + label + rank update — unknown strings
 * sort last and get **no** P93-03 scan dot.
 */
export const CASE_TASK_PRIORITY_VALUES = ['low', 'medium', 'high'] as const;
export type CaseTaskPriorityValue = (typeof CASE_TASK_PRIORITY_VALUES)[number];

/** Parallel to {@link CASE_TASK_PRIORITY_VALUES} — same index = same semantic (display + sort rank). */
export const CASE_TASK_PRIORITY_DISPLAY_LABELS = ['Low', 'Medium', 'High'] as const;

/** P92-01: due status filter bucket (client-side; local calendar for OVERDUE). */
export type CaseTaskDueStatusFilter = 'OVERDUE' | 'HAS_DUE' | 'NO_DUE';

/** P92-01: sentinel for “unassigned only” in multi-criteria assignee filter. */
export const CASE_TASK_FILTER_UNASSIGNED = '__UNASSIGNED__' as const;

/** P92-01: structured multi-criteria filter (AND across categories; fixed application order in {@link applyCaseTaskMultiCriteriaFilters}). */
export interface CaseTaskMultiCriteriaFilter {
	assigneeUserId: string | typeof CASE_TASK_FILTER_UNASSIGNED | null;
	dueStatus: CaseTaskDueStatusFilter | null;
	priorities: CaseTaskPriorityValue[];
	groupLabel: string | null;
}

/** P92-02: UI state snapshot for {@link caseTaskMultiCriteriaFilterFromUiState}. */
export type CaseTaskMultiCriteriaUiState = {
	assigneeUserId: string;
	dueStatus: string;
	priorityLow: boolean;
	priorityMedium: boolean;
	priorityHigh: boolean;
	groupLabel: string;
};

function priorityValueIndex(p: string | null | undefined): number {
	const s = p?.trim();
	if (!s) return -1;
	return CASE_TASK_PRIORITY_VALUES.indexOf(s as CaseTaskPriorityValue);
}

/**
 * Sort rank 1..3 for known values; unknown values sort like unset (last).
 * **Do not** order priorities by raw string compare — extend {@link CASE_TASK_PRIORITY_VALUES} if the engine
 * adds new canonical values (e.g. urgent); unknown strings stay in the “no rank” bucket.
 */
function prioritySortRank(p: string | null | undefined): number | null {
	const i = priorityValueIndex(p);
	if (i < 0) return null;
	return i + 1;
}

const STATUS_FROM_ENGINE: Record<string, CaseTaskStatus> = {
	OPEN: 'open',
	COMPLETED: 'completed',
	ARCHIVED: 'archived'
};

/** Map Case Engine `case_task` row to UI model. */
export function caseEngineTaskToCaseTask(row: CaseEngineCaseTask): CaseTask {
	const st = STATUS_FROM_ENGINE[row.status] ?? 'open';
	const rawRefs = row.cross_refs;
	const crossRefs: CaseTaskCrossRef[] = Array.isArray(rawRefs)
		? rawRefs.map((r) => ({
				id: r.id,
				linkedEntityType: r.linked_entity_type,
				linkedEntityId: r.linked_entity_id,
				displayLabel: r.display_label,
				targetStatus: r.target_status,
				createdAt: r.created_at,
				createdBy: r.created_by
			}))
		: [];
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		createdAt: row.created_at,
		createdBy: row.created_by,
		updatedAt: row.updated_at,
		status: st,
		linkedTimelineEntryId: row.timeline_entry_id,
		completedAt: row.completed_at,
		completedBy: row.completed_by,
		archivedAt: row.archived_at,
		archivedBy: row.archived_by,
		deletedAt: row.deleted_at,
		deletedBy: row.deleted_by,
		assigneeUserId: row.assignee_user_id,
		assigneeDisplayName: row.assignee_display_name,
		dueDate: row.due_date,
		priority: row.priority,
		groupLabel: row.group_label,
		pinned: Boolean(row.pinned),
		crossRefs
	};
}

export function replaceTaskInList(list: CaseTask[], updated: CaseTask): CaseTask[] {
	const i = list.findIndex((t) => t.id === updated.id);
	if (i < 0) return [updated, ...list];
	const next = [...list];
	next[i] = updated;
	return next;
}

/**
 * P90-01 / P92-02: Lifecycle status filter only on an already-fetched task list (render-only).
 * Text search is {@link applyCaseTaskTextSearch}; multi-criteria refinement is {@link applyCaseTaskMultiCriteriaFilters}.
 */
export function applyCaseTaskFilters(
	tasks: CaseTask[],
	opts: { statusFilter: CaseTaskStatusFilter }
): CaseTask[] {
	if (opts.statusFilter === 'all') return tasks.slice();
	return tasks.filter((t) => t.status === opts.statusFilter);
}

/**
 * P92-02: Case-scoped substring search on title, description, group label, assignee display name.
 * Empty or whitespace-only query returns `tasks.slice()` (shallow copy; no in-place mutation).
 */
export function applyCaseTaskTextSearch(tasks: CaseTask[], query: string): CaseTask[] {
	const q = query.trim().toLowerCase();
	if (q.length === 0) return tasks.slice();
	return tasks.filter((t) => {
		const title = (t.title ?? '').toLowerCase();
		const desc = String(t.description ?? '').toLowerCase();
		const gl = String(t.groupLabel ?? '').trim().toLowerCase();
		const an = String(t.assigneeDisplayName ?? '').trim().toLowerCase();
		return (
			title.includes(q) ||
			desc.includes(q) ||
			gl.includes(q) ||
			(an.length > 0 && an.includes(q))
		);
	});
}

/** P92-01: distinct non-empty trimmed group labels, sorted for stable UI. */
export function collectDistinctCaseTaskGroupLabels(tasks: CaseTask[]): string[] {
	const set = new Set<string>();
	for (const t of tasks) {
		const g = t.groupLabel?.trim();
		if (g) set.add(g);
	}
	return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** P92-01: build filter object from panel UI state. */
export function caseTaskMultiCriteriaFilterFromUiState(state: CaseTaskMultiCriteriaUiState): CaseTaskMultiCriteriaFilter {
	const priorities: CaseTaskPriorityValue[] = [];
	if (state.priorityLow) priorities.push('low');
	if (state.priorityMedium) priorities.push('medium');
	if (state.priorityHigh) priorities.push('high');
	const assigneeRaw = state.assigneeUserId.trim();
	let assigneeUserId: CaseTaskMultiCriteriaFilter['assigneeUserId'] = null;
	if (assigneeRaw === CASE_TASK_FILTER_UNASSIGNED) assigneeUserId = CASE_TASK_FILTER_UNASSIGNED;
	else if (assigneeRaw.length > 0) assigneeUserId = assigneeRaw;
	const dueRaw = state.dueStatus.trim();
	const dueStatus: CaseTaskDueStatusFilter | null =
		dueRaw === 'OVERDUE' || dueRaw === 'HAS_DUE' || dueRaw === 'NO_DUE' ? (dueRaw as CaseTaskDueStatusFilter) : null;
	const glRaw = state.groupLabel.trim();
	return {
		assigneeUserId,
		dueStatus,
		priorities,
		groupLabel: glRaw.length > 0 ? glRaw : null
	};
}

/** P92-01: true when any multi-criteria narrowing is active. */
export function caseTaskMultiCriteriaFilterIsActive(filter: CaseTaskMultiCriteriaFilter): boolean {
	if (filter.assigneeUserId !== null) return true;
	if (filter.dueStatus !== null) return true;
	if (filter.priorities.length > 0) return true;
	if (filter.groupLabel !== null && filter.groupLabel !== '') return true;
	return false;
}

/**
 * P92-01: AND refinement with fixed step order assignee → due → priority → group label.
 * Does not mutate `tasks`.
 *
 * @param options.referenceLocalDateYmd **Tests and deterministic fixtures only** — omit in production UI so
 *   “today” is always {@link localCalendarDateYmd}. Do not use a fixed reference in runtime task filtering.
 */
export function applyCaseTaskMultiCriteriaFilters(
	tasks: CaseTask[],
	filter: CaseTaskMultiCriteriaFilter,
	options?: { referenceLocalDateYmd?: string }
): CaseTask[] {
	let list = tasks.slice();
	const ref = options?.referenceLocalDateYmd ?? localCalendarDateYmd();

	if (filter.assigneeUserId !== null) {
		if (filter.assigneeUserId === CASE_TASK_FILTER_UNASSIGNED) {
			list = list.filter((t) => !t.assigneeUserId?.trim());
		} else {
			const id = filter.assigneeUserId;
			list = list.filter((t) => (t.assigneeUserId?.trim() ?? '') === id);
		}
	}

	if (filter.dueStatus !== null) {
		list = list.filter((t) => {
			const d = t.dueDate?.trim() ?? '';
			if (filter.dueStatus === 'NO_DUE') return !d;
			if (filter.dueStatus === 'HAS_DUE') return Boolean(d);
			if (filter.dueStatus === 'OVERDUE') {
				if (!d) return false;
				return isCaseTaskDueDateOverdue(d, ref);
			}
			return true;
		});
	}

	if (filter.priorities.length > 0) {
		const allowed = new Set(filter.priorities);
		list = list.filter((t) => {
			const p = t.priority?.trim().toLowerCase();
			if (!p) return false;
			return allowed.has(p as CaseTaskPriorityValue);
		});
	}

	if (filter.groupLabel !== null && filter.groupLabel !== '') {
		const gl = filter.groupLabel.trim();
		list = list.filter((t) => (t.groupLabel?.trim() ?? '') === gl);
	}

	return list;
}

/**
 * P90-02: Return a new array sorted by `createdAt` (deterministic; `id` tie-break).
 * Does not mutate `tasks`.
 */
export function sortCaseTasksByCreatedAt(
	tasks: CaseTask[],
	order: CaseTaskCreatedSortOrder
): CaseTask[] {
	const copy = [...tasks];
	copy.sort((a, b) => {
		const ta = Date.parse(a.createdAt);
		const tb = Date.parse(b.createdAt);
		const na = Number.isFinite(ta) ? ta : 0;
		const nb = Number.isFinite(tb) ? tb : 0;
		if (na !== nb) {
			return order === 'newest' ? nb - na : na - nb;
		}
		return a.id.localeCompare(b.id);
	});
	return copy;
}

/**
 * **Canonical “today” (local calendar)** for Case Task operational due logic — YYYY-MM-DD in the
 * browser’s local timezone. **Do not** re-derive “today” with ad-hoc `new Date()` date math for overdue
 * filters, scan cues, or due-line hints; use this (or {@link isCaseTaskDueDateOverdue} only, which calls
 * this internally when no reference is passed).
 *
 * **Intentionally not UTC-normalized:** two users in different time zones could disagree on “today” vs a
 * stored date — acceptable for operational awareness; not a scheduling authority.
 */
export function localCalendarDateYmd(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * P91-02 / P92-01: True when `dueDate` is strictly before **local** “today” (string compare on YYYY-MM-DD).
 * In production, **omit** the second argument so “today” is {@link localCalendarDateYmd} only.
 * Visual hint only — not SLA or escalation.
 *
 * @param referenceLocalDateYmd **Tests and deterministic fixtures only** — do not pass from production UI or
 *   other runtime logic. Intended for Vitest and stable comparisons; production must use the implicit ref.
 */
export function isCaseTaskDueDateOverdue(
	dueDateYmd: string | null | undefined,
	referenceLocalDateYmd?: string
): boolean {
	const s = dueDateYmd?.trim();
	if (!s) return false;
	const ref = referenceLocalDateYmd ?? localCalendarDateYmd();
	return s < ref;
}

/** P91-02: Human-readable date from engine YYYY-MM-DD. */
export function formatCaseTaskDueDateDisplay(dueDateYmd: string | null | undefined): string {
	const s = dueDateYmd?.trim();
	if (!s) return '';
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) return s;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	try {
		return new Date(y, mo - 1, d).toLocaleDateString(undefined, { dateStyle: 'medium' });
	} catch {
		return s;
	}
}

type DueDateSortDir = 'soonest' | 'latest';

/**
 * P91-02: Sort by optional `dueDate` (YYYY-MM-DD string order).
 * **Null/empty due dates:** always placed **after** every task that has a due date, in **both**
 * `soonest` and `latest` modes — stable and predictable (avoids “nulls jump” between modes).
 * Tie-break: `id` ascending when dates equal or both missing.
 */
function sortCaseTasksByDueDateInner(tasks: CaseTask[], order: DueDateSortDir): CaseTask[] {
	const copy = [...tasks];
	copy.sort((a, b) => {
		const da = a.dueDate?.trim() ?? '';
		const db = b.dueDate?.trim() ?? '';
		const aEmpty = !da;
		const bEmpty = !db;
		if (aEmpty && bEmpty) return a.id.localeCompare(b.id);
		if (aEmpty) return 1;
		if (bEmpty) return -1;
		const cmp = da.localeCompare(db);
		if (cmp !== 0) return order === 'soonest' ? cmp : -cmp;
		return a.id.localeCompare(b.id);
	});
	return copy;
}

/**
 * P91-03: Sort by optional `priority`. **Null/missing priority** sorts **after** all tasks that have
 * a priority, in **both** high-first and low-first modes. Tie-break: `id` ascending.
 * Ranks come from {@link CASE_TASK_PRIORITY_VALUES} order only.
 */
function sortCaseTasksByPriorityInner(tasks: CaseTask[], order: 'high_first' | 'low_first'): CaseTask[] {
	const copy = [...tasks];
	copy.sort((a, b) => {
		const ra = prioritySortRank(a.priority);
		const rb = prioritySortRank(b.priority);
		const aEmpty = ra == null;
		const bEmpty = rb == null;
		if (aEmpty && bEmpty) return a.id.localeCompare(b.id);
		if (aEmpty) return 1;
		if (bEmpty) return -1;
		const cmp = order === 'high_first' ? (rb ?? 0) - (ra ?? 0) : (ra ?? 0) - (rb ?? 0);
		if (cmp !== 0) return cmp;
		return a.id.localeCompare(b.id);
	});
	return copy;
}

/** P91-03: Short label for rows — not a status badge. Keys must match {@link CASE_TASK_PRIORITY_VALUES}. */
export function formatCaseTaskPriorityLabel(priority: string | null | undefined): string | null {
	const i = priorityValueIndex(priority);
	if (i < 0) {
		const s = priority?.trim();
		return s || null;
	}
	return CASE_TASK_PRIORITY_DISPLAY_LABELS[i] as string;
}

/**
 * P91-05 / P94-02: Operational row lines for task lists — **assignee → due → group → priority** in one coherent surface.
 * Use these (or {@link caseTaskOperationalDueLineParts}) everywhere read rows show Phase 91 fields.
 */
export function caseTaskOperationalAssigneeLine(
	task: CaseTask,
	assignableUsers: readonly { id: string; name: string }[]
): string | null {
	const id = task.assigneeUserId?.trim();
	if (!id) return null;
	const fromServer = task.assigneeDisplayName?.trim();
	if (fromServer) return `Assigned: ${fromServer}`;
	const u = assignableUsers.find((x) => x.id === id);
	return u ? `Assigned: ${u.name}` : `Assigned: ${id}`;
}

export function caseTaskOperationalPriorityLine(task: CaseTask): string | null {
	const label = formatCaseTaskPriorityLabel(task.priority);
	return label ? `Priority: ${label}` : null;
}

export function caseTaskOperationalGroupLine(task: CaseTask): string | null {
	const s = task.groupLabel?.trim();
	return s ? `Group: ${s}` : null;
}

/**
 * P93-03: Canonical **screen-reader** status when the overdue scan cue is on (`TaskOperationalRowMeta` due row).
 * Do not introduce alternate phrasing (“Past due”, “Task overdue”) in task rows — use this only.
 * Filter controls may use separate copy (e.g. bucket label “Overdue”).
 */
export const CASE_TASK_SCAN_SR_OVERDUE = 'Overdue.' as const;

/**
 * P93-03: Visible suffix after **Due …** for active open rows with calendar-overdue dates.
 * Paired with {@link CASE_TASK_SCAN_SR_OVERDUE}; the span is `aria-hidden` so SR does not double-announce.
 * **Do not** add `(overdue)`, `Overdue`, or other variants elsewhere for the same cue.
 */
export const CASE_TASK_SCAN_VISIBLE_PAST_DUE = ' (past due)' as const;

/**
 * P91-05: Due row for list display — null when unset.
 * P93-03: Overdue **scan** SR/visible copy is **not** embedded here — use {@link CASE_TASK_SCAN_SR_OVERDUE} and
 * {@link CASE_TASK_SCAN_VISIBLE_PAST_DUE} only in `TaskOperationalRowMeta` (see constants above).
 */
export function caseTaskOperationalDueLineParts(task: CaseTask): { label: string; overdue: boolean } | null {
	const s = task.dueDate?.trim();
	if (!s) return null;
	return {
		label: `Due ${formatCaseTaskDueDateDisplay(s)}`,
		overdue: isCaseTaskDueDateOverdue(s)
	};
}

/**
 * P93-03: Overdue **scan** emphasis (UI-only). True only for **active** open, non-deleted tasks with a calendar-overdue
 * due date. Uses {@link isCaseTaskDueDateOverdue} (local YYYY-MM-DD vs today) — same rule as filters; not wall-clock instant.
 */
export function caseTaskScanOverdueCue(task: CaseTask, scanSection: CaseTaskScanSection): boolean {
	if (scanSection !== 'active') return false;
	if (task.status !== 'open') return false;
	if (task.deletedAt) return false;
	const d = task.dueDate?.trim();
	if (!d) return false;
	return isCaseTaskDueDateOverdue(d);
}

/**
 * P93-03: Canonical priority for scan dots — `null` when unset or **non-canonical** (e.g. future `urgent`
 * or custom values). **Never** infer a tier from unknown strings (no dot; no accidental `high` styling).
 * Extend {@link CASE_TASK_PRIORITY_VALUES} deliberately if the engine adds a new stored value.
 */
export function caseTaskScanPriorityCueLevel(task: CaseTask): CaseTaskPriorityValue | null {
	const i = priorityValueIndex(task.priority);
	if (i < 0) return null;
	return CASE_TASK_PRIORITY_VALUES[i];
}

/**
 * P91-04: Sort by optional `groupLabel`. **No label** sorts **after** labeled tasks (both directions).
 * **Letter case:** `localeCompare` with `sensitivity: 'base'` so ordering does not depend on
 * capitalization; tie-break: `id` ascending.
 */
function sortCaseTasksByGroupLabelInner(tasks: CaseTask[], order: 'a_z' | 'z_a'): CaseTask[] {
	const copy = [...tasks];
	copy.sort((a, b) => {
		const ga = a.groupLabel?.trim() ?? '';
		const gb = b.groupLabel?.trim() ?? '';
		const aEmpty = !ga;
		const bEmpty = !gb;
		if (aEmpty && bEmpty) return a.id.localeCompare(b.id);
		if (aEmpty) return 1;
		if (bEmpty) return -1;
		const cmp = ga.localeCompare(gb, undefined, { sensitivity: 'base' });
		if (cmp !== 0) return order === 'a_z' ? cmp : -cmp;
		return a.id.localeCompare(b.id);
	});
	return copy;
}

/** P91-02 / P91-03 / P91-04: Client-side list ordering. */
export function sortCaseTasksForList(tasks: CaseTask[], mode: CaseTaskListSortMode): CaseTask[] {
	switch (mode) {
		case 'created_newest':
			return sortCaseTasksByCreatedAt(tasks, 'newest');
		case 'created_oldest':
			return sortCaseTasksByCreatedAt(tasks, 'oldest');
		case 'due_soonest':
			return sortCaseTasksByDueDateInner(tasks, 'soonest');
		case 'due_latest':
			return sortCaseTasksByDueDateInner(tasks, 'latest');
		case 'priority_high_first':
			return sortCaseTasksByPriorityInner(tasks, 'high_first');
		case 'priority_low_first':
			return sortCaseTasksByPriorityInner(tasks, 'low_first');
		case 'group_label_a_z':
			return sortCaseTasksByGroupLabelInner(tasks, 'a_z');
		case 'group_label_z_a':
			return sortCaseTasksByGroupLabelInner(tasks, 'z_a');
		default:
			return sortCaseTasksByCreatedAt(tasks, 'newest');
	}
}

/** P93-02: Sort field for explicit UI — each maps to two {@link CaseTaskListSortMode} values (no new algorithms). */
export type CaseTaskSortField = 'created' | 'due' | 'priority' | 'group_label';

/**
 * P93-02: Per-field [primary, secondary] mode pair. Primary is the default when switching to that field.
 * Operational / scanning only — not Timeline, not scheduling authority.
 *
 * **Integrity:** The union of both modes for every field must equal {@link CASE_TASK_LIST_SORT_MODES_ALL}
 * (see Vitest guard). If you add a new `CaseTaskListSortMode`, extend this map or the exhaustive list —
 * otherwise UI mapping will silently break.
 */
export const CASE_TASK_SORT_FIELD_PAIR: Record<
	CaseTaskSortField,
	readonly [CaseTaskListSortMode, CaseTaskListSortMode]
> = {
	created: ['created_newest', 'created_oldest'],
	due: ['due_soonest', 'due_latest'],
	priority: ['priority_high_first', 'priority_low_first'],
	group_label: ['group_label_a_z', 'group_label_z_a']
};

/** P93-02: Quick-sort presets → existing modes (deterministic; UI-only). */
export const CASE_TASK_SORT_QUICK_PRESET = {
	dueSoon: 'due_soonest',
	highPriorityFirst: 'priority_high_first',
	recentlyCreated: 'created_newest'
} as const satisfies Record<string, CaseTaskListSortMode>;

export function caseTaskSortFieldFromListSortMode(mode: CaseTaskListSortMode): CaseTaskSortField {
	switch (mode) {
		case 'created_newest':
		case 'created_oldest':
			return 'created';
		case 'due_soonest':
		case 'due_latest':
			return 'due';
		case 'priority_high_first':
		case 'priority_low_first':
			return 'priority';
		case 'group_label_a_z':
		case 'group_label_z_a':
			return 'group_label';
		default:
			return 'created';
	}
}

/** P93-02: Which option in {@link CASE_TASK_SORT_FIELD_PAIR} is active (0 = primary). */
export function caseTaskSortPairIndexFromListSortMode(mode: CaseTaskListSortMode): 0 | 1 {
	const field = caseTaskSortFieldFromListSortMode(mode);
	const pair = CASE_TASK_SORT_FIELD_PAIR[field];
	return pair[0] === mode ? 0 : 1;
}

export function caseTaskListSortModeFromFieldAndPairIndex(
	field: CaseTaskSortField,
	index: 0 | 1
): CaseTaskListSortMode {
	return CASE_TASK_SORT_FIELD_PAIR[field][index];
}

/** P93-02: Labels for the two direction buttons for the current field. */
export function caseTaskSortPairDirectionLabels(field: CaseTaskSortField): [string, string] {
	switch (field) {
		case 'created':
			return ['Newest first', 'Oldest first'];
		case 'due':
			return ['Soonest first', 'Latest first'];
		case 'priority':
			return ['High first', 'Low first'];
		case 'group_label':
			return ['A–Z', 'Z–A'];
	}
}

export function caseTaskSortFieldShortLabel(field: CaseTaskSortField): string {
	switch (field) {
		case 'created':
			return 'Created';
		case 'due':
			return 'Due date';
		case 'priority':
			return 'Priority';
		case 'group_label':
			return 'Group label';
	}
}

/**
 * P93-02: One-line summary for visible “current sort” (operational list; not Timeline).
 * **Derives only from `mode`** — do not pass parallel UI state; the panel must use `listSortMode` as source of truth.
 */
export function caseTaskSortActiveSummary(mode: CaseTaskListSortMode): string {
	const field = caseTaskSortFieldFromListSortMode(mode);
	const idx = caseTaskSortPairIndexFromListSortMode(mode);
	const [p0, p1] = caseTaskSortPairDirectionLabels(field);
	const dir = idx === 0 ? p0 : p1;
	return `${dir} · ${caseTaskSortFieldShortLabel(field)}`;
}

/** P93-01: Empty / missing group label — stable key segment (not a user-facing label). */
const P93_GROUP_LABEL_NONE_KEY = 'group_label:__none__';
const P93_PRIORITY_HIGH_KEY = 'priority:high';
const P93_PRIORITY_MEDIUM_KEY = 'priority:medium';
const P93_PRIORITY_LOW_KEY = 'priority:low';
const P93_PRIORITY_NONE_KEY = 'priority:__none__';

/** NFC + trim + lowercase — used only for stable bucket keys, not display. */
function p93NormalizedGroupLabelKeySegment(raw: string): string {
	return raw.trim().normalize('NFC').toLocaleLowerCase('en');
}

/**
 * Stable `CaseTaskVisualGroup.key` for group_label mode (collapse state, DOM ids).
 * Case-insensitive bucketing: "Ops" and "ops" share one key.
 */
export function caseTaskGroupLabelStableKey(groupLabel: string | null | undefined): string {
	const t = groupLabel?.trim().normalize('NFC') ?? '';
	if (!t) return P93_GROUP_LABEL_NONE_KEY;
	return `group_label:${p93NormalizedGroupLabelKeySegment(t)}`;
}

/**
 * Stable key for priority buckets (known values + unknown/empty → `priority:__none__`).
 */
export function caseTaskPriorityStableKey(priority: string | null | undefined): string {
	const p = priority?.trim().toLowerCase();
	if (p === 'high') return P93_PRIORITY_HIGH_KEY;
	if (p === 'medium') return P93_PRIORITY_MEDIUM_KEY;
	if (p === 'low') return P93_PRIORITY_LOW_KEY;
	return P93_PRIORITY_NONE_KEY;
}

/**
 * P93-01: Partition `tasks` into deterministic visual groups for the Task panel (UI-only).
 *
 * **Sort contract:** `tasks` must already be in the desired list order (e.g. after
 * {@link sortCaseTasksForList}). Order within each group is the subsequence of that order for tasks
 * in the bucket — no re-sorting or cross-group reordering.
 *
 * When **P93-02** sort is also by `group_label`, global order is by label first; **group headers** are still
 * ordered by this function’s deterministic group-key rules only — it does **not** re-sort tasks across
 * buckets relative to that global order (buckets are a partition of the sorted list).
 *
 * Does not mutate `tasks` or task fields. Omits empty groups. `mode` must not be `'none'`.
 */
export function groupCaseTasksForVisualList(
	tasks: CaseTask[],
	mode: Exclude<CaseTaskGroupByMode, 'none'>
): CaseTaskVisualGroup[] {
	if (mode === 'group_label') {
		type LabelBucket = { tasks: CaseTask[]; displayLabel: string };
		const buckets = new Map<string, LabelBucket>();
		for (const t of tasks) {
			const k = caseTaskGroupLabelStableKey(t.groupLabel);
			let b = buckets.get(k);
			if (!b) {
				const displayLabel =
					k === P93_GROUP_LABEL_NONE_KEY
						? 'No Group'
						: (t.groupLabel?.trim().normalize('NFC') ?? '');
				buckets.set(k, { tasks: [], displayLabel });
				b = buckets.get(k)!;
			}
			b.tasks.push(t);
		}
		const keys = [...buckets.keys()];
		const sortedKeys = keys
			.filter((k) => k !== P93_GROUP_LABEL_NONE_KEY)
			.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
		if (keys.includes(P93_GROUP_LABEL_NONE_KEY)) sortedKeys.push(P93_GROUP_LABEL_NONE_KEY);
		return sortedKeys
			.map((k) => {
				const b = buckets.get(k)!;
				return { key: k, label: b.displayLabel, tasks: b.tasks };
			})
			.filter((g) => g.tasks.length > 0);
	}
	if (mode === 'priority') {
		const buckets = new Map<string, CaseTask[]>();
		for (const t of tasks) {
			const k = caseTaskPriorityStableKey(t.priority);
			let arr = buckets.get(k);
			if (!arr) {
				arr = [];
				buckets.set(k, arr);
			}
			arr.push(t);
		}
		const order = [
			P93_PRIORITY_HIGH_KEY,
			P93_PRIORITY_MEDIUM_KEY,
			P93_PRIORITY_LOW_KEY,
			P93_PRIORITY_NONE_KEY
		];
		const labels: Record<string, string> = {
			[P93_PRIORITY_HIGH_KEY]: 'High',
			[P93_PRIORITY_MEDIUM_KEY]: 'Medium',
			[P93_PRIORITY_LOW_KEY]: 'Low',
			[P93_PRIORITY_NONE_KEY]: 'No Priority'
		};
		return order
			.filter((k) => buckets.has(k))
			.map((k) => ({
				key: k,
				label: labels[k] ?? k,
				tasks: buckets.get(k) ?? []
			}))
			.filter((g) => g.tasks.length > 0);
	}
	return [];
}

/**
 * P90-03: Whether the UI should offer expand/collapse for secondary row content (description full text,
 * optional reference link). Short descriptions without a link stay inline without a toggle.
 */
export function caseTaskShouldOfferDetailToggle(task: CaseTask): boolean {
	if (task.linkedTimelineEntryId) return true;
	const d = task.description?.trim() ?? '';
	return d.length > 140;
}

function formatTaskIsoInstant(iso: string): string {
	try {
		return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
	} catch {
		return iso;
	}
}

/**
 * P90-04: Read-only completion attribution (operational; not Timeline). Null when nothing to show.
 */
export function formatCaseTaskCompletionAttribution(task: CaseTask): string | null {
	const by = task.completedBy?.trim();
	const rawAt = task.completedAt?.trim();
	if (!by && !rawAt) return null;
	if (by && rawAt) return `Completed by ${by} · ${formatTaskIsoInstant(rawAt)}`;
	if (by) return `Completed by ${by}`;
	return `Completed · ${formatTaskIsoInstant(rawAt!)}`;
}

/**
 * P90-04: Read-only archive attribution (operational; not Timeline). Null when nothing to show.
 */
export function formatCaseTaskArchiveAttribution(task: CaseTask): string | null {
	const by = task.archivedBy?.trim();
	const rawAt = task.archivedAt?.trim();
	if (!by && !rawAt) return null;
	if (by && rawAt) return `Archived by ${by} · ${formatTaskIsoInstant(rawAt)}`;
	if (by) return `Archived by ${by}`;
	return `Archived · ${formatTaskIsoInstant(rawAt!)}`;
}

/**
 * P90-05: Soft-delete attribution for read-only deleted rows (operational; not Timeline).
 */
export function formatCaseTaskSoftDeleteAttribution(task: CaseTask): string | null {
	const by = task.deletedBy?.trim();
	const rawAt = task.deletedAt?.trim();
	if (!by && !rawAt) return null;
	if (by && rawAt) return `Removed by ${by} · ${formatTaskIsoInstant(rawAt)}`;
	if (by) return `Removed by ${by}`;
	return `Removed · ${formatTaskIsoInstant(rawAt!)}`;
}

/** P90-05: Order soft-deleted tasks by deleted time (newest first), then id. */
export function sortCaseTasksByDeletedAtDesc(tasks: CaseTask[]): CaseTask[] {
	const copy = [...tasks];
	copy.sort((a, b) => {
		const da = a.deletedAt?.trim() ? Date.parse(a.deletedAt) : 0;
		const db = b.deletedAt?.trim() ? Date.parse(b.deletedAt) : 0;
		const na = Number.isFinite(da) ? da : 0;
		const nb = Number.isFinite(db) ? db : 0;
		if (na !== nb) return nb - na;
		return a.id.localeCompare(b.id);
	});
	return copy;
}

/** P92-04: UI gate for bulk complete — server enforces OPEN only. */
export function caseTaskBulkCompleteEligible(task: CaseTask): boolean {
	return !task.deletedAt && task.status === 'open';
}

/** P92-04: UI gate for bulk archive — server allows OPEN|COMPLETED. */
export function caseTaskBulkArchiveEligible(task: CaseTask): boolean {
	return !task.deletedAt && (task.status === 'open' || task.status === 'completed');
}

/** P92-04: UI gate for bulk restore of soft-deleted rows. */
export function caseTaskBulkRestoreEligible(task: CaseTask): boolean {
	return Boolean(task.deletedAt);
}
