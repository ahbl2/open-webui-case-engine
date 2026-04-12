/**
 * P89-07: Case Engine persisted Tasks (`/cases/:id/case-tasks/*`).
 * Response bodies are snake_case; no Timeline writes.
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

function extractError(data: unknown, fallback: string): string {
	if (data != null && typeof data === 'object') {
		const d = data as Record<string, unknown>;
		if (typeof d.error === 'string') return d.error;
		if (typeof d.message === 'string') return d.message;
	}
	return fallback;
}

export interface CaseEngineCaseTask {
	id: string;
	case_id: string;
	title: string;
	description: string | null;
	status: string;
	timeline_entry_id: string | null;
	created_at: string;
	created_by: string;
	updated_at: string;
	updated_by: string;
	completed_at: string | null;
	completed_by: string | null;
	archived_at: string | null;
	archived_by: string | null;
	deleted_at: string | null;
	/** Present when row is soft-deleted (P90-05 visibility). */
	deleted_by: string | null;
	/** P91-01: optional assignee (`users.id`). */
	assignee_user_id: string | null;
	/** Resolved display name for reads (inactive assignees included); null when unassigned. */
	assignee_display_name: string | null;
	/** P91-02: optional calendar date (YYYY-MM-DD); awareness only — not scheduling. */
	due_date: string | null;
	/** P91-03: `low` | `medium` | `high` or null — operator awareness only; not workflow. */
	priority: string | null;
	/** P91-04: optional grouping label — scanning only; not process stage or workflow. */
	group_label: string | null;
}

/** P91-01: Legacy API users eligible for task assignment (active only). */
export interface CaseEngineAssignableUser {
	id: string;
	name: string;
	role: string;
}

function taskBase(caseId: string): string {
	return `${CASE_ENGINE_BASE_URL}/cases/${encodeURIComponent(caseId)}/case-tasks`;
}

function authHeaders(token: string): Record<string, string> {
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	};
}

export async function listCaseTasks(
	caseId: string,
	token: string,
	opts?: { includeDeleted?: boolean }
): Promise<CaseEngineCaseTask[]> {
	const q = opts?.includeDeleted ? '?include_deleted=1' : '';
	const res = await fetch(`${taskBase(caseId)}${q}`, { headers: { Authorization: `Bearer ${token}` } });
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Failed to load tasks (${res.status})`));
	}
	const raw = data as { case_tasks?: unknown };
	if (!raw || !Array.isArray(raw.case_tasks)) {
		throw new Error('Invalid tasks response');
	}
	return raw.case_tasks as CaseEngineCaseTask[];
}

export async function listCaseAssignableUsers(
	caseId: string,
	token: string
): Promise<CaseEngineAssignableUser[]> {
	const res = await fetch(`${taskBase(caseId)}/assignable-users`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Failed to load assignable users (${res.status})`));
	}
	const raw = data as { assignable_users?: unknown };
	if (!raw || !Array.isArray(raw.assignable_users)) {
		throw new Error('Invalid assignable users response');
	}
	return raw.assignable_users as CaseEngineAssignableUser[];
}

export async function createCaseTask(
	caseId: string,
	token: string,
	body: {
		title: string;
		description?: string | null;
		timeline_entry_id?: string | null;
		assignee_user_id?: string | null;
		due_date?: string | null;
		priority?: string | null;
		group_label?: string | null;
	}
): Promise<CaseEngineCaseTask> {
	const res = await fetch(taskBase(caseId), {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify({
			title: body.title,
			...(body.description !== undefined ? { description: body.description } : {}),
			...(body.timeline_entry_id !== undefined ? { timeline_entry_id: body.timeline_entry_id } : {}),
			...(body.assignee_user_id !== undefined ? { assignee_user_id: body.assignee_user_id } : {}),
			...(body.due_date !== undefined ? { due_date: body.due_date } : {}),
			...(body.priority !== undefined ? { priority: body.priority } : {}),
			...(body.group_label !== undefined ? { group_label: body.group_label } : {})
		})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Create task failed (${res.status})`));
	}
	const row = (data as { case_task?: CaseEngineCaseTask }).case_task;
	if (!row) throw new Error('Create task: missing case_task');
	return row;
}

export async function patchCaseTaskContent(
	caseId: string,
	taskId: string,
	token: string,
	patch: {
		title?: string;
		description?: string | null;
		timeline_entry_id?: string | null;
		assignee_user_id?: string | null;
		due_date?: string | null;
		priority?: string | null;
		group_label?: string | null;
	}
): Promise<CaseEngineCaseTask> {
	const res = await fetch(`${taskBase(caseId)}/${encodeURIComponent(taskId)}`, {
		method: 'PATCH',
		headers: authHeaders(token),
		body: JSON.stringify(patch)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Update task failed (${res.status})`));
	}
	const row = (data as { case_task?: CaseEngineCaseTask }).case_task;
	if (!row) throw new Error('Update task: missing case_task');
	return row;
}

export async function postCaseTaskComplete(
	caseId: string,
	taskId: string,
	token: string
): Promise<CaseEngineCaseTask> {
	const res = await fetch(`${taskBase(caseId)}/${encodeURIComponent(taskId)}/complete`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify({})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Complete task failed (${res.status})`));
	}
	const row = (data as { case_task?: CaseEngineCaseTask }).case_task;
	if (!row) throw new Error('Complete task: missing case_task');
	return row;
}

export async function postCaseTaskArchive(
	caseId: string,
	taskId: string,
	token: string
): Promise<CaseEngineCaseTask> {
	const res = await fetch(`${taskBase(caseId)}/${encodeURIComponent(taskId)}/archive`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify({})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Archive task failed (${res.status})`));
	}
	const row = (data as { case_task?: CaseEngineCaseTask }).case_task;
	if (!row) throw new Error('Archive task: missing case_task');
	return row;
}

export async function postCaseTaskReopen(
	caseId: string,
	taskId: string,
	token: string
): Promise<CaseEngineCaseTask> {
	const res = await fetch(`${taskBase(caseId)}/${encodeURIComponent(taskId)}/reopen`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify({})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Reopen task failed (${res.status})`));
	}
	const row = (data as { case_task?: CaseEngineCaseTask }).case_task;
	if (!row) throw new Error('Reopen task: missing case_task');
	return row;
}

export async function postCaseTaskSoftDelete(
	caseId: string,
	taskId: string,
	token: string
): Promise<CaseEngineCaseTask> {
	const res = await fetch(`${taskBase(caseId)}/${encodeURIComponent(taskId)}/delete`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify({})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Delete task failed (${res.status})`));
	}
	const row = (data as { case_task?: CaseEngineCaseTask }).case_task;
	if (!row) throw new Error('Delete task: missing case_task');
	return row;
}

export async function postCaseTaskRestore(
	caseId: string,
	taskId: string,
	token: string
): Promise<CaseEngineCaseTask> {
	const res = await fetch(`${taskBase(caseId)}/${encodeURIComponent(taskId)}/restore`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify({})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(extractError(data, `Restore task failed (${res.status})`));
	}
	const row = (data as { case_task?: CaseEngineCaseTask }).case_task;
	if (!row) throw new Error('Restore task: missing case_task');
	return row;
}
