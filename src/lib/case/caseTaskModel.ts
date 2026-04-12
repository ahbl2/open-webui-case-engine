/**
 * P86 / P89-07: Operational Tasks model for Case Workspace UI.
 * P89-07: When loaded from Case Engine, ids and fields reflect server `case_tasks` (authoritative for persisted rows).
 * Tasks are not Timeline entries — no `occurred_at`; optional `timeline_entry_id` is reference-only.
 * Must NOT directly or indirectly cause any mutation of timeline_entries from UI code paths.
 */
import type { CaseEngineCaseTask } from '$lib/apis/caseEngine/caseTasksApi';

/** UI lifecycle bucket (maps from engine OPEN | COMPLETED | ARCHIVED). */
export type CaseTaskStatus = 'open' | 'completed' | 'archived';

/** P90-01: Client-side list filter — all statuses or one lifecycle bucket. */
export type CaseTaskStatusFilter = 'all' | CaseTaskStatus;

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
}

/** P91-04: Max length aligned with Case Engine `CASE_TASK_GROUP_LABEL_MAX` (trimmed text). */
export const CASE_TASK_GROUP_LABEL_MAX = 200;

/**
 * P91-03: Single source for allowed values, display labels, and sort rank (index in this array + 1).
 * Keep {@link formatCaseTaskPriorityLabel} and {@link sortCaseTasksByPriorityInner} aligned with this order only.
 */
export const CASE_TASK_PRIORITY_VALUES = ['low', 'medium', 'high'] as const;
export type CaseTaskPriorityValue = (typeof CASE_TASK_PRIORITY_VALUES)[number];

/** Parallel to {@link CASE_TASK_PRIORITY_VALUES} — same index = same semantic (display + sort rank). */
export const CASE_TASK_PRIORITY_DISPLAY_LABELS = ['Low', 'Medium', 'High'] as const;

function priorityValueIndex(p: string | null | undefined): number {
	const s = p?.trim();
	if (!s) return -1;
	return CASE_TASK_PRIORITY_VALUES.indexOf(s as CaseTaskPriorityValue);
}

/** Sort rank 1..3 for known values; unknown values sort like unset (last). */
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
		groupLabel: row.group_label
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
 * P90-01 / P91-04: Narrow an already-fetched task list (render-only). Text matches title, description,
 * and grouping label, case-insensitive; query is trimmed. Intersection: status filter then text.
 * **Group label:** uses the same trimmed string as row display (`groupLabel` after trim) — no parallel
 * display vocabulary; search is case-insensitive on that value.
 */
export function applyCaseTaskFilters(
	tasks: CaseTask[],
	opts: { statusFilter: CaseTaskStatusFilter; textQuery: string }
): CaseTask[] {
	const q = opts.textQuery.trim().toLowerCase();
	let list = tasks;
	if (opts.statusFilter !== 'all') {
		list = list.filter((t) => t.status === opts.statusFilter);
	}
	if (q.length > 0) {
		list = list.filter((t) => {
			const title = (t.title ?? '').toLowerCase();
			const desc = String(t.description ?? '').toLowerCase();
			const gl = String(t.groupLabel ?? '').trim().toLowerCase();
			return title.includes(q) || desc.includes(q) || gl.includes(q);
		});
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
 * P91-02: Today’s calendar date in the **browser’s local timezone** (YYYY-MM-DD).
 * Used only for display-side comparisons. **Intentionally not UTC-normalized:** two users in
 * different time zones could disagree on “today” vs a stored date — acceptable for Phase 91
 * operational awareness on a typical LE-style network; not a scheduling authority.
 */
export function localCalendarDateYmd(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * P91-02: True when `dueDate` is strictly before **local** “today” (string compare on YYYY-MM-DD).
 * Visual hint only — not server truth, not SLA, not escalation.
 */
export function isCaseTaskDueDateOverdue(dueDateYmd: string | null | undefined): boolean {
	const s = dueDateYmd?.trim();
	if (!s) return false;
	return s < localCalendarDateYmd();
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
 * P91-05: Operational row lines for task lists — **assignee → due → priority → group** in one coherent surface.
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

/** P91-05: Due row for list display — null when unset. */
export function caseTaskOperationalDueLineParts(task: CaseTask): { label: string; overdue: boolean } | null {
	const s = task.dueDate?.trim();
	if (!s) return null;
	return {
		label: `Due ${formatCaseTaskDueDateDisplay(s)}`,
		overdue: isCaseTaskDueDateOverdue(s)
	};
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
