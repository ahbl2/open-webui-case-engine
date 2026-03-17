/**
 * P14-04: Case Engine Operations API client.
 * All data flows through Case Engine; UI does not persist operational data.
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

export interface OperationalPlan {
	id: string;
	case_id: string;
	type: string | null;
	title: string;
	description: string | null;
	status: string;
	linked_workflow_item_id: string | null;
	primary_entity_type: string | null;
	primary_entity_normalized_id: string | null;
	created_at: string;
	created_by: string;
	updated_at: string | null;
	updated_by: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
}

export interface OperationalEvent {
	id: string;
	case_id: string;
	operational_plan_id: string;
	event_time_planned: string | null;
	event_time_actual: string | null;
	event_type: string | null;
	status: string;
	notes: string | null;
	linked_timeline_entry_id: string | null;
	created_at: string;
	created_by: string;
	[key: string]: unknown;
}

export interface OperationalTask {
	id: string;
	case_id: string;
	operational_plan_id: string | null;
	title: string;
	description: string | null;
	status: string;
	priority: string | null;
	due_at: string | null;
	assigned_to_user_id: string | null;
	assigned_at: string | null;
	completed_at: string | null;
	completed_by: string | null;
	created_at: string;
	created_by: string;
	[key: string]: unknown;
}

export interface OperationalTimelineResponse {
	plan_id: string;
	events: OperationalEvent[];
}

export interface OperationalTaskBoardResponse {
	open: OperationalTask[];
	in_progress: OperationalTask[];
	done: OperationalTask[];
	cancelled: OperationalTask[];
}

export interface InvestigatorTaskQueueResponse {
	open: OperationalTask[];
	in_progress: OperationalTask[];
	done: OperationalTask[];
	cancelled: OperationalTask[];
}

export interface OperationProgressSummaryResponse {
	total_tasks: number;
	open_count: number;
	in_progress_count: number;
	done_count: number;
	cancelled_count: number;
	assigned_count: number;
	unassigned_count: number;
	completed_count: number;
}

/** P14-05: Evidence workflow step (from Case Engine). */
export interface EvidenceWorkflowStep {
	step_id: string;
	title: string;
	description?: string | null;
	status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
	completed_at?: string | null;
	completed_by?: string | null;
}

/** P14-05: Evidence collection workflow with parsed steps. */
export interface EvidenceWorkflow {
	id: string;
	case_id: string;
	operational_plan_id: string | null;
	title: string;
	description: string | null;
	status: string;
	steps: EvidenceWorkflowStep[];
	created_at: string;
	created_by: string;
	updated_at: string | null;
	updated_by: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
}

function authHeaders(token: string): HeadersInit {
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	};
}

export async function getOperationalPlans(caseId: string, token: string): Promise<OperationalPlan[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/plans`, {
		headers: authHeaders(token)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to list plans (${res.status})`);
	const plans = (data as { plans?: OperationalPlan[] }).plans;
	return Array.isArray(plans) ? plans : [];
}

export async function getOperationalTimeline(
	caseId: string,
	planId: string,
	token: string
): Promise<OperationalTimelineResponse> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/plans/${planId}/timeline`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to get timeline (${res.status})`);
	return data as OperationalTimelineResponse;
}

export async function getOperationalTasks(
	caseId: string,
	token: string,
	planId?: string
): Promise<OperationalTaskBoardResponse> {
	const url = planId
		? `${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/plans/${planId}/tasks`
		: `${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/tasks`;
	const res = await fetch(url, { headers: authHeaders(token) });
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to get tasks (${res.status})`);
	return data as OperationalTaskBoardResponse;
}

export async function getOperationProgressSummary(
	caseId: string,
	token: string,
	planId?: string
): Promise<OperationProgressSummaryResponse> {
	const qs = planId != null && planId !== '' ? `?planId=${encodeURIComponent(planId)}` : '';
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/progress-summary${qs}`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get progress summary (${res.status})`);
	return data as OperationProgressSummaryResponse;
}

export async function getInvestigatorTaskQueue(
	caseId: string,
	token: string,
	investigatorUserId?: string
): Promise<InvestigatorTaskQueueResponse> {
	const qs =
		investigatorUserId != null && investigatorUserId !== ''
			? `?investigatorUserId=${encodeURIComponent(investigatorUserId)}`
			: '';
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/task-queue${qs}`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get task queue (${res.status})`);
	return data as InvestigatorTaskQueueResponse;
}

export async function createOperationalPlan(
	caseId: string,
	token: string,
	payload: { title: string; description?: string; type?: string; initialTasks?: { title: string; priority?: string }[] }
): Promise<{ plan: OperationalPlan; tasks: OperationalTask[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/plans`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to create plan (${res.status})`);
	return data as { plan: OperationalPlan; tasks: OperationalTask[] };
}

export async function scheduleOperationalEvent(
	caseId: string,
	token: string,
	payload: {
		operational_plan_id: string;
		event_time_planned: string;
		event_type?: string;
		notes?: string;
	}
): Promise<OperationalEvent> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/events`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to schedule event (${res.status})`);
	return data as OperationalEvent;
}

export async function assignOperationalTask(
	caseId: string,
	taskId: string,
	assignedToUserId: string,
	token: string
): Promise<OperationalTask> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/tasks/${taskId}/assign`,
		{
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify({ assigned_to_user_id: assignedToUserId })
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to assign task (${res.status})`);
	return data as OperationalTask;
}

export async function reassignOperationalTask(
	caseId: string,
	taskId: string,
	assignedToUserId: string,
	token: string
): Promise<OperationalTask> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/tasks/${taskId}/reassign`,
		{
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify({ assigned_to_user_id: assignedToUserId })
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to reassign task (${res.status})`);
	return data as OperationalTask;
}

export async function completeOperationalTask(
	caseId: string,
	taskId: string,
	token: string
): Promise<OperationalTask> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/tasks/${taskId}/complete`,
		{
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify({})
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to complete task (${res.status})`);
	return data as OperationalTask;
}

// --- P14-05: Evidence workflows ---

export async function getEvidenceWorkflows(
	caseId: string,
	planId: string,
	token: string
): Promise<EvidenceWorkflow[]> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/evidence-workflows`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to list evidence workflows (${res.status})`);
	const workflows = (data as { workflows?: EvidenceWorkflow[] }).workflows;
	return Array.isArray(workflows) ? workflows : [];
}

export async function getEvidenceWorkflow(
	caseId: string,
	workflowId: string,
	token: string
): Promise<EvidenceWorkflow> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/evidence-workflows/${workflowId}`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get evidence workflow (${res.status})`);
	return data as EvidenceWorkflow;
}

export async function createEvidenceWorkflow(
	caseId: string,
	planId: string,
	token: string,
	payload: { title: string; description?: string; steps?: { step_id: string; title: string; description?: string }[] }
): Promise<EvidenceWorkflow> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/evidence-workflows`,
		{
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(payload)
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to create evidence workflow (${res.status})`);
	return data as EvidenceWorkflow;
}

export async function completeEvidenceWorkflowStep(
	caseId: string,
	workflowId: string,
	stepId: string,
	token: string
): Promise<EvidenceWorkflow> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/evidence-workflows/${workflowId}/steps/${stepId}/complete`,
		{
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify({})
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to complete step (${res.status})`);
	return data as EvidenceWorkflow;
}

// --- P14-06: Surveillance sessions ---

export interface SurveillanceSession {
	id: string;
	case_id: string;
	operational_plan_id: string;
	title: string;
	location: string | null;
	started_at: string;
	started_by: string;
	ended_at: string | null;
	ended_by: string | null;
	notes: string | null;
	created_at: string;
	created_by: string;
	updated_at: string | null;
	updated_by: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
}

export interface SurveillanceEvent {
	id: string;
	session_id: string;
	case_id: string;
	timestamp: string;
	event_type: string | null;
	description: string | null;
	created_at: string;
	created_by: string;
	deleted_at: string | null;
	deleted_by: string | null;
}

export interface SurveillanceSummary {
	session_title: string;
	duration_minutes: number | null;
	event_count: number;
	key_events: { timestamp: string; event_type: string | null; description: string | null }[];
}

export async function getSurveillanceSessions(
	caseId: string,
	planId: string,
	token: string
): Promise<SurveillanceSession[]> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/surveillance`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to list surveillance sessions (${res.status})`);
	const sessions = (data as { sessions?: SurveillanceSession[] }).sessions;
	return Array.isArray(sessions) ? sessions : [];
}

export async function getSurveillanceSession(
	caseId: string,
	sessionId: string,
	token: string
): Promise<{ session: SurveillanceSession; events: SurveillanceEvent[]; summary: SurveillanceSummary | null }> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/surveillance/${sessionId}`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get surveillance session (${res.status})`);
	return data as { session: SurveillanceSession; events: SurveillanceEvent[]; summary: SurveillanceSummary | null };
}

export async function createSurveillanceSession(
	caseId: string,
	planId: string,
	token: string,
	payload: { title: string; location?: string; notes?: string }
): Promise<SurveillanceSession> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/surveillance`,
		{
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(payload)
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to start surveillance session (${res.status})`);
	return data as SurveillanceSession;
}

export async function logSurveillanceEvent(
	caseId: string,
	sessionId: string,
	token: string,
	payload: { timestamp?: string; event_type?: string; description?: string }
): Promise<SurveillanceEvent> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/surveillance/${sessionId}/event`,
		{
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify(payload)
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to log event (${res.status})`);
	return data as SurveillanceEvent;
}

export async function endSurveillanceSession(
	caseId: string,
	sessionId: string,
	token: string
): Promise<SurveillanceSession> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/surveillance/${sessionId}/end`,
		{
			method: 'POST',
			headers: authHeaders(token),
			body: JSON.stringify({})
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to end session (${res.status})`);
	return data as SurveillanceSession;
}

// --- P14-07: Unified operational timeline (read-only) ---

export type UnifiedTimelineSourceType = 'SURVEILLANCE_EVENT' | 'EVIDENCE_WORKFLOW_STEP' | 'OPERATIONAL_TASK';

export interface UnifiedOperationalTimelineEvent {
	id: string;
	case_id: string;
	source_type: UnifiedTimelineSourceType;
	source_id: string;
	timestamp: string;
	event_type: string;
	description: string | null;
	metadata: Record<string, unknown>;
}

export async function getUnifiedOperationalTimeline(
	caseId: string,
	planId: string,
	token: string
): Promise<UnifiedOperationalTimelineEvent[]> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/timeline`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get operational timeline (${res.status})`);
	const events = (data as { events?: UnifiedOperationalTimelineEvent[] }).events;
	return Array.isArray(events) ? events : [];
}

export async function getCaseOperationalTimeline(
	caseId: string,
	token: string
): Promise<UnifiedOperationalTimelineEvent[]> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/timeline`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get case operational timeline (${res.status})`);
	const events = (data as { events?: UnifiedOperationalTimelineEvent[] }).events;
	return Array.isArray(events) ? events : [];
}

// --- P14-08: Operational reporting (read-only) ---

export interface OperationalPlanSummary {
	plan_id: string;
	title: string;
	type: string | null;
	status: string;
	task_count: number;
	completed_task_count: number;
	surveillance_session_count: number;
	evidence_workflow_count: number;
}

export interface SurveillanceSummary {
	session_count: number;
	total_event_count: number;
	active_session_count: number;
	completed_session_count: number;
	latest_session_at: string | null;
}

export interface EvidenceWorkflowSummary {
	workflow_count: number;
	total_steps: number;
	completed_steps: number;
	pending_steps: number;
}

export interface TaskCoordinationSummary {
	total_tasks: number;
	open_count: number;
	in_progress_count: number;
	done_count: number;
	cancelled_count: number;
	assigned_count: number;
	unassigned_count: number;
}

export interface OperationalBrief {
	case_id: string;
	operational_plan_id: string | null;
	generated_at: string;
	plan_summary: OperationalPlanSummary | null;
	surveillance_summary: SurveillanceSummary;
	evidence_summary: EvidenceWorkflowSummary;
	task_summary: TaskCoordinationSummary;
	timeline_event_count: number;
	recent_timeline_events: UnifiedOperationalTimelineEvent[];
}

export interface PlanOperationalSummary {
	plan_summary: OperationalPlanSummary;
	surveillance_summary: SurveillanceSummary;
	evidence_summary: EvidenceWorkflowSummary;
	task_summary: TaskCoordinationSummary;
}

export async function getCaseOperationalBrief(
	caseId: string,
	token: string
): Promise<OperationalBrief> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/brief`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get case operational brief (${res.status})`);
	return data as OperationalBrief;
}

export async function getPlanOperationalBrief(
	caseId: string,
	planId: string,
	token: string
): Promise<OperationalBrief> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/brief`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get plan operational brief (${res.status})`);
	return data as OperationalBrief;
}

export async function getPlanOperationalSummary(
	caseId: string,
	planId: string,
	token: string
): Promise<PlanOperationalSummary> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/summary`,
		{ headers: authHeaders(token) }
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error((data as { error?: string })?.error ?? `Failed to get plan operational summary (${res.status})`);
	return data as PlanOperationalSummary;
}

/** P14-09: Trigger download of case operational brief as JSON. */
export async function exportCaseBriefJSON(
	caseId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/brief/export/json`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const text = await res.text();
	triggerDownload(new Blob([text], { type: 'application/json' }), 'operational-brief-case.json');
}

/** P14-09: Trigger download of plan operational brief as JSON. */
export async function exportPlanBriefJSON(
	caseId: string,
	planId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/brief/export/json`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const text = await res.text();
	triggerDownload(new Blob([text], { type: 'application/json' }), 'operational-brief-plan.json');
}

/** P14-09: Trigger download of case operational brief as Markdown. */
export async function exportCaseBriefMarkdown(
	caseId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/brief/export/md`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const text = await res.text();
	triggerDownload(
		new Blob([text], { type: 'text/markdown' }),
		'operational-brief-case.md'
	);
}

/** P14-09: Trigger download of plan operational brief as Markdown. */
export async function exportPlanBriefMarkdown(
	caseId: string,
	planId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/brief/export/md`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const text = await res.text();
	triggerDownload(
		new Blob([text], { type: 'text/markdown' }),
		'operational-brief-plan.md'
	);
}

/** P14-09: Trigger download of case operational brief as HTML. */
export async function exportCaseBriefHTML(
	caseId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/brief/export/html`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const text = await res.text();
	triggerDownload(new Blob([text], { type: 'text/html' }), 'operational-brief-case.html');
}

/** P14-09: Trigger download of plan operational brief as HTML. */
export async function exportPlanBriefHTML(
	caseId: string,
	planId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/operations/${planId}/brief/export/html`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const text = await res.text();
	triggerDownload(new Blob([text], { type: 'text/html' }), 'operational-brief-plan.html');
}

function triggerDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
