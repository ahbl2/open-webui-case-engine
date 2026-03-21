/**
 * Case Engine API (Ticket 5) – separate from WebUI backend.
 * Proxied at /case-api by Caddy.
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

/** Extract error message from API response; avoids [object Object] when backend returns { error: { message: '...' } }. */
function extractApiErrorMessage(data: unknown, fallback: string): string {
	if (data != null && typeof data === 'object') {
		const d = data as Record<string, unknown>;
		if (typeof d.error === 'string') return d.error;
		if (d.error != null && typeof d.error === 'object' && typeof (d.error as Record<string, unknown>).message === 'string')
			return (d.error as Record<string, unknown>).message as string;
		if (typeof d.message === 'string') return d.message;
	}
	return fallback;
}

export type CaseEngineScope = 'case' | 'CID' | 'SIU' | 'ALL';
export type CaseEngineCitation = { type: 'entry' | 'file'; id: string };

export interface CaseEngineCase {
	id: string;
	case_number: string;
	title: string;
	unit: string;
	status: string;
	created_at?: string;
	[key: string]: unknown;
}

/**
 * P19.75-02: Explicit failure classification for POST /auth/owui/browser-resolve.
 * Distinguishes true network failure from HTTP 429 / 401 / 5xx so the UI does not
 * treat a reachable but rate-limited Case Engine as “service unavailable.”
 */
export type BrowserResolveFailureClassification =
	| 'network_unreachable'
	| 'rate_limited'
	| 'unauthorized'
	| 'server_error'
	| 'client_error';

export class BrowserResolveFailure extends Error {
	override readonly name = 'BrowserResolveFailure';
	constructor(
		public readonly classification: BrowserResolveFailureClassification,
		message: string,
		public readonly httpStatus?: number,
		public readonly body?: unknown
	) {
		super(message);
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

function classifyBrowserResolveHttpStatus(status: number): BrowserResolveFailureClassification {
	if (status === 429) return 'rate_limited';
	if (status === 401 || status === 403) return 'unauthorized';
	if (status >= 500 && status <= 599) return 'server_error';
	if (status >= 400 && status <= 499) return 'client_error';
	return 'server_error';
}

/**
 * P19-05: Browser-accessible authorization state resolution.
 * Called once per session after OWUI login to determine Case Engine access state
 * without requiring a separate Case Engine login step.
 *
 * P19 Auth Bridge: When state is 'active', backend also returns a token for Case Engine API calls.
 *
 * P19.75-02: Non-OK HTTP responses throw {@link BrowserResolveFailure} with a stable classification.
 * Only {@link BrowserResolveFailureClassification} `network_unreachable` should map to /access-unavailable.
 *
 * Security note: this endpoint trusts the reverse proxy (Caddy/Vite) to enforce
 * OWUI session authentication before requests reach Case Engine.
 */
export async function browserResolveOwuiAuth(params: {
	owui_user_id: string;
	username_or_email: string;
	display_name?: string;
}): Promise<{
	state: string;
	user: null | { id: string; role: string; units: string[]; capabilities: string[] };
	reason?: string;
	token?: string;
}> {
	const url = `${CASE_ENGINE_BASE_URL}/auth/owui/browser-resolve`;
	const body = JSON.stringify(params);
	const maxAttempts = 3;
	let lastErr: unknown;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				const msg = extractApiErrorMessage(
					data,
					`Failed to resolve Case Engine auth state (${res.status})`
				);
				throw new BrowserResolveFailure(classifyBrowserResolveHttpStatus(res.status), msg, res.status, data);
			}
			return data;
		} catch (e) {
			if (e instanceof BrowserResolveFailure) {
				throw e;
			}
			lastErr = e;
			const msg = e instanceof Error ? e.message : String(e);
			const isNetworkFailure =
				e instanceof TypeError ||
				/failed to fetch|networkerror|load failed|network request failed/i.test(msg);
			if (!isNetworkFailure || attempt === maxAttempts - 1) {
				if (isNetworkFailure) {
					throw new BrowserResolveFailure(
						'network_unreachable',
						msg,
						undefined,
						undefined
					);
				}
				throw e;
			}
			await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
		}
	}
	throw lastErr;
}

export async function login(name: string, password: string): Promise<{ token: string; user: { id: string; name: string; role: string } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, password })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Login failed (${res.status})`);
	}
	return data;
}

/** Case Engine OWUI user list (admin only). status filter optional: pending | active | disabled */
export interface CaseEngineOwuiUserRow {
	owui_user_id: string;
	username_or_email: string;
	display_name: string | null;
	status: string;
	role: string;
	created_at: string;
}

export async function listCaseEngineOwuiUsers(
	token: string,
	status?: 'pending' | 'active' | 'disabled'
): Promise<CaseEngineOwuiUserRow[]> {
	const qs = status ? `?status=${status}` : '';
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users${qs}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list users (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

export async function updateCaseEngineOwuiUserStatus(
	token: string,
	owuiUserId: string,
	status: 'pending' | 'active' | 'disabled'
): Promise<{ state: string; user: unknown }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users/${encodeURIComponent(owuiUserId)}/status`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ status })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to update status (${res.status})`);
	}
	return data;
}

export async function updateCaseEngineOwuiUserRole(
	token: string,
	owuiUserId: string,
	role: 'detective' | 'admin'
): Promise<{ state: string; user: unknown }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users/${encodeURIComponent(owuiUserId)}/role`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ role })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to update role (${res.status})`);
	}
	return data;
}

export async function updateCaseEngineOwuiUserUnits(
	token: string,
	owuiUserId: string,
	units: string[]
): Promise<{ state: string; user: unknown }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users/${encodeURIComponent(owuiUserId)}/units`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ units })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to update units (${res.status})`);
	}
	return data;
}

export async function updateCaseEngineOwuiUserCapabilities(
	token: string,
	owuiUserId: string,
	capabilities: string[]
): Promise<{ state: string; user: unknown }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/auth/owui/users/${encodeURIComponent(owuiUserId)}/capabilities`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ capabilities })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to update capabilities (${res.status})`);
	}
	return data;
}

/** Ticket 7: Sidebar case list - minimal metadata, RBAC enforced server-side */
export async function listCasesSidebar(token: string): Promise<CaseEngineCase[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/sidebar`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list cases (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

export async function listCases(unit: 'CID' | 'SIU' | 'ALL', token: string): Promise<CaseEngineCase[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases?unit=${unit}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list cases (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

/** Ticket 8: AI context bundle - case + timeline + files + citations (for prompt injection) */
export interface AiContextBundle {
	case: { id: string; case_number: string; title: string; unit: string; status: string };
	timeline: Array<{
		id: string;
		occurred_at: string;
		type: string;
		location_text: string | null;
		text_cleaned: string | null;
		text_original: string;
		created_by: string;
		created_at: string;
	}>;
	files: Array<{ id: string; original_filename: string; extracted_text_preview: string }>;
	citations: Array<
		| { kind: 'timeline'; id: string; occurred_at: string; created_by: string }
		| { kind: 'file'; id: string; original_filename: string }
	>;
}

export async function getCaseAiContext(
	caseId: string,
	token: string
): Promise<AiContextBundle | null> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ai-context`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	if (res.status === 403 || res.status === 404) return null;
	if (!res.ok) {
		throw new Error('Failed to fetch AI context');
	}
	return res.json();
}

/** Ticket 7: Case context - metadata + recent entries */
export interface CaseContextEntry {
	id: string;
	occurred_at: string;
	type: string;
	location_text: string | null;
	text_original: string;
	created_by: string;
	created_at: string;
	/** Ticket 25: Evidence tags */
	tags?: string[];
}

export interface CaseContextResponse {
	case: { id: string; case_number: string; title: string; unit: string; status: string };
	recent_entries: CaseContextEntry[];
}

export async function getCaseContext(caseId: string, token: string): Promise<CaseContextResponse> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/context`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to get context (${res.status})`);
	}
	return data;
}

/** Legacy ask: now uses Ticket 10 RAG flow; maps response to legacy citation shape for Chat.svelte */
export async function askCase(
	caseId: string,
	question: string,
	_scope: CaseEngineScope,
	token: string
): Promise<{ answer: string; citations: CaseEngineCitation[] }> {
	const res = await askCaseQuestion(caseId, question, token, 8);
	return {
		answer: res.answer,
		citations: res.used_citations.map((c) => ({
			type: (c.source_type === 'timeline_entry' ? 'entry' : 'file') as 'entry' | 'file',
			id: c.id
		}))
	};
}

/** Ticket 10: Case-scoped AI Q&A with citations (RAG-lite) */
export type AskCitation =
	| {
			source_type: 'timeline_entry';
			id: string;
			occurred_at: string;
			created_at: string;
			type: string;
			snippet: string;
	  }
	| {
			source_type: 'case_file';
			id: string;
			original_filename: string;
			uploaded_at: string;
			snippet: string;
	  };

export interface AskCaseQuestionResponse {
	question: string;
	answer: string;
	confidence: 'LOW' | 'MEDIUM' | 'HIGH';
	citations: AskCitation[];
	used_citations: AskCitation[];
}

export async function askCaseQuestion(
	caseId: string,
	question: string,
	token: string,
	topK?: number,
	model?: string
): Promise<AskCaseQuestionResponse> {
	const body: Record<string, unknown> = { question: question.trim(), topK: topK ?? 8 };
	if (model) body.model = model;

	const doFetch = () =>
		fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ask`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify(body)
		});

	let res = await doFetch();
	let retryAttempted = false;

	// Transparent single retry on 422 — this is an intermittent LLM JSON parse failure
	// (Ollama occasionally returns prose instead of the required JSON envelope).
	// Retrying with the identical payload usually succeeds on the next generation.
	if (res.status === 422) {
		retryAttempted = true;
		console.debug('[case-engine] /ask returned 422 (LLM parse failure), retrying once', {
			question: question.trim()
		});
		res = await doFetch();
	}

	const data = await res.json().catch(() => ({}));

	if (res.status === 422) {
		if (retryAttempted) {
			console.debug('[case-engine] /ask retry also returned 422, giving up');
		}
		const err = new Error(data?.error ?? 'AI returned invalid response') as Error & {
			citations?: AskCitation[];
		};
		err.citations = data?.citations;
		throw err;
	}
	if (!res.ok) {
		throw new Error(data?.error ?? `Ask failed (${res.status})`);
	}
	return data;
}

// ─── Files (Ticket 5 Part 5) ───────────────────────────────────────────────

export interface CaseFile {
	id: string;
	original_filename: string;
	mime_type: string | null;
	file_size_bytes: number;
	uploaded_by: string;
	uploaded_at: string;
	/** Ticket 25: Evidence tags */
	tags?: string[];
	[key: string]: unknown;
}

export async function listCaseFiles(caseId: string, token: string): Promise<CaseFile[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/files`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list files (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

export async function uploadCaseFile(caseId: string, file: File, token: string): Promise<CaseFile> {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/files`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`
		},
		body: form
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Upload failed (${res.status})`);
	}
	return data;
}

export function getCaseFileDownloadUrl(fileId: string): string {
	return `${CASE_ENGINE_BASE_URL}/files/${fileId}`;
}

export async function downloadCaseFile(fileId: string, filename: string, token: string): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/files/${fileId}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`Download failed (${res.status})`);
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename || 'download';
	a.click();
	URL.revokeObjectURL(url);
}

export async function extractCaseFileText(fileId: string, token: string): Promise<{
	id: string;
	fileId: string;
	caseId: string;
	status: string;
	message: string | null;
	extracted_at: string;
}> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/files/${fileId}/extract-text`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Extract failed (${res.status})`);
	}
	return data;
}

export async function getCaseFileText(fileId: string, token: string): Promise<{
	fileId: string;
	caseId: string;
	status: string;
	message: string | null;
	extracted_text: string;
	extracted_at: string;
	extracted_by: string;
}> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/files/${fileId}/text`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to get text (${res.status})`);
	}
	return data;
}

// ─── AI Intake (Ticket 9) ──────────────────────────────────────────────────

export interface Intake {
	id: string;
	case_id: string;
	raw_text: string;
	status: string;
	submitted_by: string;
	created_at: string;
	[key: string]: unknown;
}

export interface IntakeProposal {
	id: string;
	intake_id: string;
	occurred_at: string | null;
	type: string;
	location_text: string | null;
	tags: string | string[] | null;
	text_original: string;
	text_cleaned?: string | null;
	created_by: string;
	proposed_at: string;
	created_at: string;
	[key: string]: unknown;
}

export async function createIntake(
	caseId: string,
	rawText: string,
	token: string
): Promise<{ intake: Intake }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/intakes`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ raw_text: rawText })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Submit failed (${res.status})`);
	}
	return data;
}

export async function proposeIntake(
	intakeId: string,
	token: string,
	model?: string
): Promise<{ intake: Intake; proposals: IntakeProposal[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/intakes/${intakeId}/propose`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(model ? { model } : {})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		if (res.status === 422) {
			throw new Error(data?.error ?? 'AI returned invalid proposal');
		}
		throw new Error(data?.error ?? `Propose failed (${res.status})`);
	}
	return data;
}

export async function getIntake(
	intakeId: string,
	token: string
): Promise<{ intake: Intake; proposals: IntakeProposal[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/intakes/${intakeId}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to get intake (${res.status})`);
	}
	return data;
}

export async function getIntakeProposals(
	intakeId: string,
	token: string
): Promise<IntakeProposal[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/intakes/${intakeId}/proposals`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to get proposals (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

export async function decideIntake(
	intakeId: string,
	outcome: 'APPROVED' | 'REJECTED',
	token: string,
	reason?: string
): Promise<{ created_entry_ids?: string[]; intake?: Intake }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/intakes/${intakeId}/decide`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ outcome, reason: reason ?? undefined })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Decide failed (${res.status})`);
	}
	return data;
}

function buildExportParams(
	format: 'html' | 'pdf',
	opts?: { includeOriginal?: boolean; includeFiles?: boolean }
): string {
	const sp = new URLSearchParams();
	sp.set('format', format);
	if (opts?.includeOriginal) sp.set('includeOriginal', 'true');
	if (opts?.includeFiles) sp.set('includeFiles', 'true');
	return sp.toString();
}

/** Ticket 11: Running Case Notes export – opens HTML in new tab (auth via fetch) */
export async function openRunningNotesHtml(
	caseId: string,
	token: string,
	opts?: { includeOriginal?: boolean; includeFiles?: boolean }
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/export/running-notes?${buildExportParams('html', opts)}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) throw new Error(`Export failed (${res.status})`);
	const html = await res.text();
	const blob = new Blob([html], { type: 'text/html' });
	const url = URL.createObjectURL(blob);
	window.open(url, '_blank');
	setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Ticket 11: Download Running Notes as HTML with friendly filename */
export async function downloadRunningNotesHtml(
	caseId: string,
	token: string,
	opts?: { includeOriginal?: boolean; includeFiles?: boolean; caseNumber?: string }
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/export/running-notes?${buildExportParams('html', opts)}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) throw new Error(`Export failed (${res.status})`);
	const html = await res.text();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Case_${caseId.slice(0, 8)}_Running_Notes_${new Date().toISOString().slice(0, 10)}.html`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	} else if (opts?.caseNumber) {
		const safe = (opts.caseNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'case';
		filename = `Case_${safe}_Running_Notes_${new Date().toISOString().slice(0, 10)}.html`;
	}
	const blob = new Blob([html], { type: 'text/html' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Ticket 12: Cross-case AI query – search across cases within unit scope */
export type CrossCaseCitation =
	| {
			source_type: 'timeline_entry';
			id: string;
			case_id: string;
			case_number: string;
			occurred_at: string;
			snippet: string;
	  }
	| {
			source_type: 'case_file';
			id: string;
			case_id: string;
			case_number: string;
			filename: string;
			snippet: string;
	  };

export interface AskCrossCaseResponse {
	question: string;
	answer: string;
	confidence: 'LOW' | 'MEDIUM' | 'HIGH';
	citations: CrossCaseCitation[];
	used_citations: CrossCaseCitation[];
}

export async function askCrossCase(
	question: string,
	token: string,
	opts?: { topK?: number; unitScope?: 'CID' | 'SIU' | 'ALL' }
): Promise<AskCrossCaseResponse> {
	const body: Record<string, unknown> = { question: question.trim() };
	if (opts?.topK != null) body.topK = opts.topK;
	if (opts?.unitScope != null) body.unitScope = opts.unitScope;
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/ask-cross`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (res.status === 422) {
		const err = new Error((data as { error?: string })?.error ?? 'AI returned invalid response') as Error & {
			citations?: CrossCaseCitation[];
		};
		err.citations = (data as { citations?: CrossCaseCitation[] })?.citations;
		throw err;
	}
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Cross-case ask failed (${res.status})`);
	}
	return data;
}

/** Ticket 11: Download Running Notes as PDF – returns false if not implemented (501) */
export async function downloadRunningNotesPdf(
	caseId: string,
	token: string,
	opts?: { includeOriginal?: boolean; includeFiles?: boolean }
): Promise<boolean> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/export/running-notes?${buildExportParams('pdf', opts)}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (res.status === 501) return false;
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const blob = await res.blob();
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `running-notes-${caseId.slice(0, 8)}.pdf`;
	a.click();
	URL.revokeObjectURL(url);
	return true;
}

export async function listCaseIntakes(caseId: string, token: string): Promise<Intake[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/intakes`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Failed to list intakes (${res.status})`);
	}
	return Array.isArray(data) ? data : [];
}

// ─── Ticket 21: Evidence Graph ──────────────────────────────────────────────

export interface GraphSourceRef {
  evidenceItemId: string;
  offsets?: [number, number];
}

export interface GraphNode {
  id: string;
  type: 'person' | 'phone' | 'location' | 'event';
  label: string;
  normalized: string;
  sources: GraphSourceRef[];
}

export interface GraphEdge {
  id: string;
  type: string;
  from: string;
  to: string;
  sources: GraphSourceRef[];
}

export interface GraphEvidenceItem {
  id: string;
  kind: 'timeline_entry' | 'case_file';
  sourceId: string;
  occurredAt?: string;
  createdAt?: string;
  createdBy?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  filename?: string;
  text: string;
}

export interface CaseGraphResponse {
  caseId: string;
  generatedAt: string;
  params: { includeDeleted: boolean; maxSources: number; maxTextPerSource: number; mode: string };
  evidencePack: { packVersion: number; items: GraphEvidenceItem[] };
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: { nodeCount: number; edgeCount: number; sourceCount: number };
  };
}

export async function getCaseGraph(
  caseId: string,
  token: string,
  params?: { includeDeleted?: boolean; maxSources?: number; maxTextPerSource?: number }
): Promise<CaseGraphResponse> {
  const sp = new URLSearchParams();
  if (params?.includeDeleted) sp.set('includeDeleted', 'true');
  if (params?.maxSources != null) sp.set('maxSources', String(params.maxSources));
  if (params?.maxTextPerSource != null) sp.set('maxTextPerSource', String(params.maxTextPerSource));
  const qs = sp.toString();
  const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/graph${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Failed to load graph (${res.status})`);
  }
  return data as CaseGraphResponse;
}

// ─── Ticket 23: Timeline Intelligence ───────────────────────────────────────

export interface TimelineIntelligenceParams {
	q?: string;
	person?: string;
	phone?: string;
	location?: string;
	type?: string;
	tag?: string;
	startDate?: string;
	endDate?: string;
	cluster?: 'none' | 'day' | 'week';
}

export interface TimelineIntelligenceEntry {
	id: string;
	occurred_at: string;
	type: string;
	location_text: string | null;
	text_original: string;
	text_cleaned: string | null;
	cluster_key?: string;
}

export interface TimelineIntelligenceResponse {
	caseId: string;
	entries: TimelineIntelligenceEntry[];
	stats: { returnedEntries: number; totalMatches?: number };
	cluster?: string;
}

export async function getTimelineIntelligence(
	caseId: string,
	token: string,
	params?: TimelineIntelligenceParams
): Promise<TimelineIntelligenceResponse> {
	const sp = new URLSearchParams();
	if (params?.q) sp.set('q', params.q);
	if (params?.person) sp.set('person', params.person);
	if (params?.phone) sp.set('phone', params.phone);
	if (params?.location) sp.set('location', params.location);
	if (params?.type) sp.set('type', params.type);
	if (params?.tag) sp.set('tag', params.tag);
	if (params?.startDate) sp.set('startDate', params.startDate);
	if (params?.endDate) sp.set('endDate', params.endDate);
	if (params?.cluster) sp.set('cluster', params.cluster);
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/timeline/intelligence${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Timeline intelligence failed (${res.status})`);
	}
	return data as TimelineIntelligenceResponse;
}

// ─── Search (Ticket 5 Part 5) ──────────────────────────────────────────────

export type SearchScope = 'case' | 'unit' | 'all';

export interface SearchResultItem {
	type: 'entry' | 'file';
	caseId: string;
	id: string;
	snippet: string;
	sort_time: string;
}

export interface SearchResponse {
	q: string;
	scope: string;
	results: SearchResultItem[];
}

// ─── Ticket 13: Integrity & Audit ───────────────────────────────────────────

export interface AuditLogItem {
	id: string;
	action: string;
	created_at: string;
	user_id: string;
	user_role: string | null;
	entity_type: string;
	entity_id: string;
	details: Record<string, unknown>;
}

export interface CaseAuditResponse {
	case: { id: string; case_number: string };
	items: AuditLogItem[];
	next_cursor: string | null;
}

export async function getCaseAudit(
	caseId: string,
	token: string,
	params?: { limit?: number; cursor?: string; before?: string; includeSystem?: boolean; includeDeleted?: boolean }
): Promise<CaseAuditResponse> {
	const sp = new URLSearchParams();
	if (params?.limit != null) sp.set('limit', String(params.limit));
	if (params?.cursor) sp.set('cursor', params.cursor);
	if (params?.before) sp.set('before', params.before);
	if (params?.includeSystem === false) sp.set('includeSystem', 'false');
	if (params?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/audit${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to fetch audit (${res.status})`);
	return data;
}

export async function exportCaseAudit(
	caseId: string,
	token: string,
	format: 'json' | 'csv',
	params?: { limit?: number; includeDeleted?: boolean }
): Promise<void> {
	const sp = new URLSearchParams();
	sp.set('format', format);
	if (params?.limit != null) sp.set('limit', String(params.limit));
	if (params?.includeDeleted) sp.set('includeDeleted', 'true');
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/audit/export?${sp}`,
		{ headers: { Authorization: `Bearer ${token}` } }
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Case_${caseId.slice(0, 8)}_Audit_${new Date().toISOString().slice(0, 10)}.${format}`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export interface DeletedItemsResponse {
	entries: Array<Record<string, unknown>>;
	files: Array<Record<string, unknown>>;
	intakes: Array<Record<string, unknown>>;
}

export async function getCaseDeleted(
	caseId: string,
	token: string,
	types?: string
): Promise<DeletedItemsResponse> {
	const sp = types ? `?types=${encodeURIComponent(types)}` : '';
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/deleted${sp}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to fetch deleted items (${res.status})`);
	return data;
}

// ─── Official Case Timeline (timeline_entries) ────────────────────────────────

export interface TimelineEntry {
	id: string;
	case_id: string;
	occurred_at: string;
	created_at: string;
	created_by: string;
	type: string;
	location_text: string | null;
	tags: string[];
	text_original: string;
	text_cleaned: string | null;
	deleted_at: string | null;
}

/** List all non-deleted official timeline entries for a case, ordered by occurred_at ASC. */
export async function listCaseTimelineEntries(caseId: string, token: string): Promise<TimelineEntry[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to load timeline (${res.status})`);
	return data as TimelineEntry[];
}

export async function restoreTimelineEntry(caseId: string, entryId: string, token: string): Promise<Record<string, unknown>> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries/${entryId}/restore`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Restore failed (${res.status})`);
	return data;
}

export async function restoreCaseFile(caseId: string, fileId: string, token: string): Promise<Record<string, unknown>> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/files/${fileId}/restore`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Restore failed (${res.status})`);
	return data;
}

export interface IntakeHistoryItem {
	[key: string]: unknown;
	proposals?: IntakeProposal[];
}

export interface IntakeHistoryResponse {
	intakes: IntakeHistoryItem[];
}

export async function getCaseIntakeHistory(
	caseId: string,
	token: string,
	params?: { limit?: number; includeProposals?: boolean; includeDeleted?: boolean }
): Promise<IntakeHistoryResponse> {
	const sp = new URLSearchParams();
	if (params?.limit != null) sp.set('limit', String(params.limit));
	if (params?.includeProposals === false) sp.set('includeProposals', 'false');
	if (params?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/intakes/history${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to fetch intake history (${res.status})`);
	return data;
}

// ─── Ticket 17: Warrant Workflow (templates, render, AI draft, warrant packet) ─────

export interface TemplateMeta {
	templateId: string;
	label: string;
	category: string;
	disabled?: boolean;
}

export async function listTemplates(token: string): Promise<{ templates: TemplateMeta[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/templates`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Failed to list templates (${res.status})`);
	}
	const templates = Array.isArray((data as { templates?: TemplateMeta[] }).templates)
		? (data as { templates: TemplateMeta[] }).templates
		: [];
	return { templates };
}

export interface RenderTemplateResponse {
	templateId: string;
	renderedHtml: string;
	missingFields: string[];
}

export async function renderTemplate(
	caseId: string,
	templateId: string,
	token: string,
	opts?: {
		mergeOverrides?: { case?: Record<string, unknown>; agency?: Record<string, unknown> };
		options?: { includeDeleted?: boolean };
	}
): Promise<RenderTemplateResponse> {
	const body: { templateId: string; mergeOverrides?: unknown; options?: unknown } = { templateId: templateId.trim() };
	if (opts?.mergeOverrides) body.mergeOverrides = opts.mergeOverrides;
	if (opts?.options) body.options = opts.options;
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/templates/render`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Render failed (${res.status})`);
	}
	return data as RenderTemplateResponse;
}

/** Ticket 20: Render template to PDF (download) */
export async function renderTemplatePdf(
	caseId: string,
	templateId: string,
	token: string,
	opts?: {
		mergeOverrides?: { case?: Record<string, unknown>; agency?: Record<string, unknown> };
		options?: { includeDeleted?: boolean };
		caseNumber?: string;
	}
): Promise<void> {
	const body: { templateId: string; mergeOverrides?: unknown; options?: unknown } = { templateId: templateId.trim() };
	if (opts?.mergeOverrides) body.mergeOverrides = opts.mergeOverrides;
	if (opts?.options) body.options = opts.options;
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/templates/render-pdf`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `PDF render failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Rendered_Template_${caseId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	} else if (opts?.caseNumber) {
		const safe = (opts.caseNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'case';
		filename = `Rendered_Template_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`;
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export interface WarrantDraftCitation {
	claim: string;
	evidenceItemIds: string[];
}

export interface WarrantDraftResult {
	caseId: string;
	purpose: string;
	generatedAt: string;
	evidencePack: { packVersion: number; items: unknown[] };
	draft: {
		title: string;
		probableCauseNarrative: string;
		requestedItems: string[];
		locations: string[];
		people: string[];
		timelineHighlights?: string[];
		citations: WarrantDraftCitation[];
		confidenceNotes: string[];
		missingInfoQuestions: string[];
	};
	model: { provider: string; model: string };
}

/** Ticket 22: AI Case Summary Generator */
export interface CaseSummaryEvidenceItem {
	id: string;
	kind: 'timeline_entry' | 'case_file';
	sourceId: string;
	type: string;
	createdAt: string;
	createdBy?: string;
	excerpt: string;
}

export interface CaseSummaryResult {
	caseId: string;
	generatedAt: string;
	params: { maxSources: number; maxTextPerSource: number };
	evidencePack: { packVersion: number; items: CaseSummaryEvidenceItem[] };
	summary: {
		primarySuspects: string[];
		keyEvents: string[];
		evidenceHighlights: string[];
		recommendedNextSteps: string[];
		openQuestions: string[];
	};
	citations: Array<{
		evidenceItemIds: string[];
		note?: string;
	}>;
}

export async function requestCaseSummary(
	caseId: string,
	token: string,
	opts?: { maxSources?: number; maxTextPerSource?: number }
): Promise<CaseSummaryResult> {
	const body: Record<string, unknown> = {};
	if (opts?.maxSources != null) body.maxSources = opts.maxSources;
	if (opts?.maxTextPerSource != null) body.maxTextPerSource = opts.maxTextPerSource;
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ai/case-summary`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(Object.keys(body).length ? body : {})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `Case summary failed (${res.status})`);
	}
	return data as CaseSummaryResult;
}

export async function requestAiWarrantDraft(
	caseId: string,
	token: string,
	opts?: {
		factsFocus?: string;
		options?: {
			maxEvidenceItems?: number;
			includeFiles?: boolean;
			includeTimeline?: boolean;
			includeDeleted?: boolean;
		};
	}
): Promise<WarrantDraftResult> {
	const body: Record<string, unknown> = { purpose: 'probable_cause' };
	if (opts?.factsFocus) body.factsFocus = opts.factsFocus;
	body.options = opts?.options ?? {
		maxEvidenceItems: 25,
		includeFiles: true,
		includeTimeline: true
	};
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ai/warrant-draft`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error((data as { error?: string })?.error ?? `AI warrant draft failed (${res.status})`);
	}
	return data as WarrantDraftResult;
}

/** P15-07: Narrative timeline (Phase 15). */
export interface NarrativeEvent {
	event_id: string;
	case_id: string;
	event_type: string;
	occurred_at: string;
	title: string | null;
	description: string | null;
	source_type: string;
	source_id: string;
	citations: Array<{ source_type: string; source_id: string }>;
}
export async function getNarrativeTimeline(
	caseId: string,
	token: string
): Promise<{ case_id: string; events: NarrativeEvent[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/narrative/timeline`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Narrative timeline failed (${res.status})`);
	return data as { case_id: string; events: NarrativeEvent[] };
}

/** P15-07: Warrant narrative proposal (Phase 15). */
export interface WarrantNarrativeSection {
	section: string;
	text: string;
	citations: unknown[];
}
export async function postWarrantNarrativeProposal(
	caseId: string,
	token: string
): Promise<{ case_id: string; proposal: { sections: WarrantNarrativeSection[] } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/narrative/warrant-proposal`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Warrant proposal failed (${res.status})`);
	return data as { case_id: string; proposal: { sections: WarrantNarrativeSection[] } };
}

/** P15-07: Exhibit list (Phase 15). */
export interface ExhibitItem {
	exhibit_id: string;
	case_id: string;
	title: string | null;
	description: string | null;
	source_type: string;
	source_id: string;
	occurred_at: string;
	citations: unknown[];
}
export async function getExhibits(
	caseId: string,
	token: string
): Promise<{ case_id: string; exhibits: ExhibitItem[] }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/exhibits`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Exhibits failed (${res.status})`);
	return data as { case_id: string; exhibits: ExhibitItem[] };
}

/** P15-07: Prosecutor summary (Phase 15). */
export interface ProsecutorSummarySection {
	section: string;
	text: string;
	citations: unknown[];
}
export async function getProsecutorSummary(
	caseId: string,
	token: string
): Promise<{ case_id: string; summary: { sections: ProsecutorSummarySection[] } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/prosecutor-summary`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Prosecutor summary failed (${res.status})`);
	return data as { case_id: string; summary: { sections: ProsecutorSummarySection[] } };
}

export type NarrativeExportFormat = 'json' | 'md' | 'html';
const NARRATIVE_EXPORT_PATHS = [
	'narrative-timeline',
	'warrant-narrative',
	'exhibits',
	'prosecutor-summary',
	'court-packet'
] as const;

/** P15-07: Download or open narrative/court export. */
export async function fetchNarrativeExport(
	caseId: string,
	token: string,
	path: (typeof NARRATIVE_EXPORT_PATHS)[number],
	format: NarrativeExportFormat,
	action: 'download' | 'open'
): Promise<void> {
	const sp = new URLSearchParams();
	sp.set('format', format);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/exports/${path}?${sp}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Export failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentType = res.headers.get('Content-Type') ?? '';
	const contentDisposition = res.headers.get('Content-Disposition');
	const ext = format === 'json' ? 'json' : format === 'md' ? 'md' : 'html';
	const casePrefix = caseId.slice(0, 8);
	let filename = `case-${casePrefix}-${path}.${ext}`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	}
	const url = URL.createObjectURL(blob);
	if (action === 'open' && (contentType.includes('html') || contentType.includes('markdown'))) {
		window.open(url, '_blank', 'noopener');
		// Revoke after a delay so the new tab can load
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	} else {
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}
}

export async function downloadWarrantPacket(
	caseId: string,
	token: string,
	opts?: { includeDeleted?: boolean; caseNumber?: string }
): Promise<void> {
	const sp = new URLSearchParams();
	sp.set('format', 'html');
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/exports/warrant-packet?${sp}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Download failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Warrant_Packet_${caseId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.html`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	} else if (opts?.caseNumber) {
		const safe = (opts.caseNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'case';
		filename = `Warrant_Packet_${safe}_${new Date().toISOString().slice(0, 10)}.html`;
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Ticket 20: Download warrant packet as PDF */
export async function downloadWarrantPacketPdf(
	caseId: string,
	token: string,
	opts?: { includeDeleted?: boolean; caseNumber?: string }
): Promise<void> {
	const sp = new URLSearchParams();
	sp.set('format', 'pdf');
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/exports/warrant-packet?${sp}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `PDF download failed (${res.status})`);
	}
	const blob = await res.blob();
	const contentDisposition = res.headers.get('Content-Disposition');
	let filename = `Warrant_Packet_${caseId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`;
	if (contentDisposition) {
		const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
		if (match) filename = match[1].trim();
	} else if (opts?.caseNumber) {
		const safe = (opts.caseNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'case';
		filename = `Warrant_Packet_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`;
	}
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

/** Ticket 19: Warrant Draft Workspace */
export interface WarrantDraftItem {
	id: string;
	caseId: string;
	templateId: string;
	title: string;
	latestVersionId: string;
	latestVersionAt: string;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
}

export async function listWarrantDrafts(
	caseId: string,
	token: string,
	opts?: { includeDeleted?: boolean }
): Promise<{ items: WarrantDraftItem[] }> {
	const sp = new URLSearchParams();
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts${qs ? `?${qs}` : ''}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to list drafts (${res.status})`);
	return data as { items: WarrantDraftItem[] };
}

export interface WarrantDraftData {
	templateId?: string;
	facts?: {
		affiantName?: string;
		affiantBadge?: string;
		targetLocation?: string;
		requestedItemsText?: string;
		probableCauseText?: string;
		factsFocus?: string;
	};
	ai?: { used?: boolean; narrative?: string; generatedAt?: string };
}

export async function createWarrantDraft(
	caseId: string,
	token: string,
	payload: { templateId: string; title?: string; data: Record<string, unknown> }
): Promise<{ draft: WarrantDraftItem; version: { id: string; createdAt: string; createdBy: string } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to create draft (${res.status})`);
	return data;
}

export async function getWarrantDraft(
	caseId: string,
	draftId: string,
	token: string,
	opts?: { includeDeleted?: boolean }
): Promise<{
	draft: WarrantDraftItem;
	latest: { versionId: string; data: Record<string, unknown>; createdAt: string; createdBy: string };
}> {
	const sp = new URLSearchParams();
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts/${draftId}${qs ? `?${qs}` : ''}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to get draft (${res.status})`);
	return data;
}

export async function createWarrantDraftVersion(
	caseId: string,
	draftId: string,
	token: string,
	payload: { data: Record<string, unknown> }
): Promise<{ version: { id: string; createdAt: string; createdBy: string } }> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts/${draftId}/versions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to save version (${res.status})`);
	return data;
}

export async function deleteWarrantDraft(caseId: string, draftId: string, token: string): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts/${draftId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Failed to delete draft (${res.status})`);
	}
}

export async function restoreWarrantDraft(
	caseId: string,
	draftId: string,
	token: string
): Promise<WarrantDraftItem> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/warrant-drafts/${draftId}/restore`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to restore draft (${res.status})`);
	return data as WarrantDraftItem;
}

// ─── Ticket 25: Evidence tags ───────────────────────────────────────────────

/** Add tag to timeline entry */
export async function addEntryTag(
	caseId: string,
	entryId: string,
	tag: string,
	token: string
): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries/${entryId}/tags`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ tag })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Add tag failed (${res.status})`);
}

/** Remove tag from timeline entry */
export async function removeEntryTag(
	caseId: string,
	entryId: string,
	tag: string,
	token: string
): Promise<void> {
	const enc = encodeURIComponent(tag);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/entries/${entryId}/tags/${enc}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (res.status === 204) return;
	const data = await res.json().catch(() => ({}));
	throw new Error((data as { error?: string })?.error ?? `Remove tag failed (${res.status})`);
}

/** Add tag to case file */
export async function addFileTag(
	caseId: string,
	fileId: string,
	tag: string,
	token: string
): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/files/${fileId}/tags`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ tag })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Add tag failed (${res.status})`);
}

/** Remove tag from case file */
export async function removeFileTag(
	caseId: string,
	fileId: string,
	tag: string,
	token: string
): Promise<void> {
	const enc = encodeURIComponent(tag);
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/files/${fileId}/tags/${enc}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (res.status === 204) return;
	const data = await res.json().catch(() => ({}));
	throw new Error((data as { error?: string })?.error ?? `Remove tag failed (${res.status})`);
}

// ─── P13-05: Workflow items (Phase 13) ──────────────────────────────────────

export type WorkflowItemType = 'HYPOTHESIS' | 'GAP';
export type WorkflowItemOrigin = 'INVESTIGATOR' | 'PROPOSAL';

export interface WorkflowItemCitation {
	source_type: string;
	source_id: string;
	note?: string;
	[key: string]: unknown;
}

export interface WorkflowItem {
	id: string;
	case_id: string;
	type: string;
	title: string;
	description: string | null;
	status: string;
	priority: number | null;
	entity_type: string | null;
	entity_normalized_id: string | null;
	lead_id: string | null;
	citations: WorkflowItemCitation[];
	origin: WorkflowItemOrigin;
	created_by: string;
	created_at: string;
	updated_at: string;
	updated_by: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
}

export interface WorkflowItemCreateInput {
	type: WorkflowItemType;
	title: string;
	description?: string;
	status?: string;
	priority?: number;
	entity_type?: string;
	entity_normalized_id?: string;
	citations?: WorkflowItemCitation[];
}

export interface WorkflowItemUpdateInput {
	title?: string;
	description?: string;
	status?: string;
	priority?: number;
}

export async function listWorkflowItems(
	caseId: string,
	token: string,
	params?: { type?: WorkflowItemType; includeDeleted?: boolean; entityType?: string; entityNormalizedId?: string }
): Promise<WorkflowItem[]> {
	const sp = new URLSearchParams();
	if (params?.type) sp.set('type', params.type);
	if (params?.includeDeleted) sp.set('includeDeleted', 'true');
	if (params?.entityType && params?.entityNormalizedId) {
		sp.set('entity_type', params.entityType);
		sp.set('entity_normalized_id', params.entityNormalizedId);
	}
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to list workflow items (${res.status})`);
	const items = (data as { workflow_items?: WorkflowItem[] }).workflow_items;
	return Array.isArray(items) ? items : [];
}

export async function getWorkflowItem(
	caseId: string,
	workflowItemId: string,
	token: string,
	opts?: { includeDeleted?: boolean }
): Promise<WorkflowItem> {
	const sp = new URLSearchParams();
	if (opts?.includeDeleted) sp.set('includeDeleted', 'true');
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items/${workflowItemId}${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to get workflow item (${res.status})`);
	return data as WorkflowItem;
}

export async function createWorkflowItem(
	caseId: string,
	token: string,
	payload: WorkflowItemCreateInput
): Promise<WorkflowItem> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to create workflow item (${res.status})`);
	return data as WorkflowItem;
}

export async function updateWorkflowItem(
	caseId: string,
	workflowItemId: string,
	token: string,
	payload: WorkflowItemUpdateInput
): Promise<WorkflowItem> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items/${workflowItemId}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(payload)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to update workflow item (${res.status})`);
	return data as WorkflowItem;
}

export async function deleteWorkflowItem(
	caseId: string,
	workflowItemId: string,
	token: string
): Promise<WorkflowItem> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items/${workflowItemId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to delete workflow item (${res.status})`);
	return data as WorkflowItem;
}

export async function restoreWorkflowItem(
	caseId: string,
	workflowItemId: string,
	token: string
): Promise<WorkflowItem> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-items/${workflowItemId}/restore`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Restore failed (${res.status})`);
	return data as WorkflowItem;
}

export interface WorkflowProposal {
	id: string;
	case_id: string;
	proposal_type: 'CREATE_HYPOTHESIS' | 'CREATE_GAP';
	status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
	suggested_payload: {
		type?: string;
		title?: string;
		description?: string;
		status?: string;
		priority?: number;
		entity_type?: string | null;
		entity_normalized_id?: string | null;
		[key: string]: unknown;
	} | null;
	citations: Array<{ source_type: string; source_id: string; note?: string; [key: string]: unknown }>;
	workflow_item_id: string | null;
	created_by: string;
	created_at: string;
	resolved_at: string | null;
	resolved_by: string | null;
}

/** List workflow proposals for a case. */
export async function listWorkflowProposals(
	caseId: string,
	token: string,
	params?: { status?: string }
): Promise<WorkflowProposal[]> {
	const sp = new URLSearchParams();
	if (params?.status) sp.set('status', params.status);
	const qs = sp.toString();
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-proposals${qs ? `?${qs}` : ''}`;
	const res = await fetch(url, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to list workflow proposals (${res.status})`);
	const items = (data as { workflow_proposals?: WorkflowProposal[] }).workflow_proposals;
	return Array.isArray(items) ? items : [];
}

export async function acceptWorkflowProposal(
	caseId: string,
	proposalId: string,
	token: string
): Promise<{ proposal: WorkflowProposal; workflow_item: WorkflowItem }> {
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-proposals/${proposalId}/accept`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to accept proposal (${res.status})`);
	return data as { proposal: WorkflowProposal; workflow_item: WorkflowItem };
}

export async function rejectWorkflowProposal(
	caseId: string,
	proposalId: string,
	token: string,
	reason?: string
): Promise<WorkflowProposal> {
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/workflow-proposals/${proposalId}/reject`;
	const body: { reason?: string } = {};
	if (reason && reason.trim()) body.reason = reason.trim();
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to reject proposal (${res.status})`);
	return data as WorkflowProposal;
}

// ─── Search (Ticket 5 Part 5) ──────────────────────────────────────────────

export async function searchCases(
	params: { q: string; scope: SearchScope; caseId?: string; unit?: 'CID' | 'SIU'; tag?: string },
	token: string
): Promise<SearchResponse> {
	const sp = new URLSearchParams();
	sp.set('q', params.q);
	sp.set('scope', params.scope);
	if (params.caseId) sp.set('caseId', params.caseId);
	if (params.unit) sp.set('unit', params.unit);
	if (params.tag?.trim()) sp.set('tag', params.tag.trim());
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/search?${sp}`, {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		}
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data?.error ?? `Search failed (${res.status})`);
	}
	return data;
}

// ─── P19-08: Thread Scope Associations ────────────────────────────────────

/**
 * Association between an OWUI chat thread (external_thread_id) and a case.
 * Returned by all case thread association endpoints.
 */
export interface CaseThreadAssociation {
	id: string;
	case_id: string;
	external_thread_id: string;
	scope_type: 'case';
	created_at: string;
	created_by: string;
	updated_at: string;
}

/**
 * Association between an OWUI chat thread (thread_id) and a user's personal desktop.
 * Returned by all personal thread association endpoints.
 */
export interface PersonalThreadAssociation {
	id: string;
	owner_user_id: string;
	thread_id: string;
	scope_type: 'personal';
	created_at: string;
	created_by: string;
	updated_at: string;
}

/** List all active case-scoped thread associations for a case. Requires case read access. */
export async function listCaseThreadAssociations(
	caseId: string,
	token: string
): Promise<CaseThreadAssociation[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/threads`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(extractApiErrorMessage(data, `Failed to list case threads (${res.status})`));
	return Array.isArray(data) ? (data as CaseThreadAssociation[]) : [];
}

/** Optional one-time 401 retry: caller provides a function to resolve a fresh token. */
export type BindRetryOptions = { getFreshToken?: () => Promise<string | null> };

/**
 * Create or restore a case thread association (idempotent upsert).
 * Requires case mutate access. Throws on scope conflict (400) or access denied (403).
 * On 401 only: if getFreshToken is provided, resolves once, retries once, then surfaces error if still failing.
 */
export async function upsertCaseThreadAssociation(
	caseId: string,
	threadId: string,
	token: string,
	options?: BindRetryOptions
): Promise<CaseThreadAssociation> {
	if (!token || String(token).trim() === '') {
		throw new Error('Case Engine token is required to bind thread to case');
	}
	const url = `${CASE_ENGINE_BASE_URL}/cases/${caseId}/threads/${encodeURIComponent(threadId)}`;
	const doRequest = (t: string) =>
		fetch(url, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
		});
	let res = await doRequest(token);
	if (!res.ok && res.status === 401 && options?.getFreshToken) {
		const newToken = await options.getFreshToken();
		if (newToken && String(newToken).trim() !== '') {
			res = await doRequest(newToken);
		}
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(extractApiErrorMessage(data, `Failed to bind thread to case (${res.status})`));
	return data as CaseThreadAssociation;
}

/** Soft-delete a case thread association. Requires case mutate access. */
export async function deleteCaseThreadAssociation(
	caseId: string,
	threadId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/threads/${encodeURIComponent(threadId)}`,
		{
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(
			extractApiErrorMessage(data, `Failed to remove case thread association (${res.status})`)
		);
	}
}

/** List all active personal thread associations for the authenticated user. */
export async function listPersonalThreadAssociations(
	token: string
): Promise<PersonalThreadAssociation[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/desktop/threads`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(extractApiErrorMessage(data, `Failed to list personal threads (${res.status})`));
	return Array.isArray(data) ? (data as PersonalThreadAssociation[]) : [];
}

/**
 * Create or restore a personal thread association (idempotent upsert).
 * Throws on scope conflict (400) — thread already active in case scope.
 * On 401 only: if getFreshToken is provided, resolves once, retries once, then surfaces error if still failing.
 */
export async function upsertPersonalThreadAssociation(
	threadId: string,
	token: string,
	options?: BindRetryOptions
): Promise<PersonalThreadAssociation> {
	if (!token || String(token).trim() === '') {
		throw new Error('Case Engine token is required to bind thread to personal desktop');
	}
	const url = `${CASE_ENGINE_BASE_URL}/desktop/threads/${encodeURIComponent(threadId)}`;
	const doRequest = (t: string) =>
		fetch(url, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
		});
	let res = await doRequest(token);
	if (!res.ok && res.status === 401 && options?.getFreshToken) {
		const newToken = await options.getFreshToken();
		if (newToken && String(newToken).trim() !== '') {
			res = await doRequest(newToken);
		}
	}
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			extractApiErrorMessage(data, `Failed to bind thread to personal desktop (${res.status})`)
		);
	return data as PersonalThreadAssociation;
}

/** Soft-delete a personal thread association. */
export async function deletePersonalThreadAssociation(
	threadId: string,
	token: string
): Promise<void> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/desktop/threads/${encodeURIComponent(threadId)}`,
		{
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error(
			extractApiErrorMessage(data, `Failed to remove personal thread association (${res.status})`)
		);
	}
}

// ─── P19-09: Proposal Pipeline ────────────────────────────────────────────────

export type ProposalScope = 'case' | 'personal';
export type ProposalType = 'note' | 'timeline';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'committed';

export interface ProposalRecord {
	id: string;
	case_id: string;
	source_scope: ProposalScope;
	source_thread_id: string;
	source_message_id: string | null;
	proposal_type: ProposalType;
	proposed_payload: string; // JSON string — parse in callers
	status: ProposalStatus;
	created_by: string;
	created_at: string;
	reviewed_by: string | null;
	reviewed_at: string | null;
	committed_at: string | null;
	committed_record_id: string | null;
	rejection_reason: string | null;
}

export interface CreateProposalParams {
	source_scope: ProposalScope;
	source_thread_id: string;
	source_message_id?: string;
	proposal_type: ProposalType;
	proposed_payload: Record<string, unknown>;
}

/** List all proposals for a case. Optionally filter by status. */
export async function listProposals(
	caseId: string,
	token: string,
	status?: ProposalStatus
): Promise<ProposalRecord[]> {
	// Relative `/case-api` base: do not use `new URL()` without a base (throws before fetch).
	const qs = status ? `?status=${encodeURIComponent(status)}` : '';
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals${qs}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to list proposals (${res.status})`
		);
	return Array.isArray(data) ? (data as ProposalRecord[]) : [];
}

/** Create a proposal from chat content. */
export async function createProposal(
	caseId: string,
	params: CreateProposalParams,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(params)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to create proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Get a single proposal by id. */
export async function getProposal(
	caseId: string,
	proposalId: string,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to get proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Update the payload of a pending proposal. */
export async function updateProposal(
	caseId: string,
	proposalId: string,
	newPayload: Record<string, unknown>,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ proposed_payload: newPayload })
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to update proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Approve a pending proposal. */
export async function approveProposal(
	caseId: string,
	proposalId: string,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}/approve`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to approve proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Reject a pending proposal. rejection_reason is required. */
export async function rejectProposal(
	caseId: string,
	proposalId: string,
	rejectionReason: string,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}/reject`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ rejection_reason: rejectionReason })
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to reject proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Commit an approved proposal into an official case record. */
export async function commitProposal(
	caseId: string,
	proposalId: string,
	token: string
): Promise<ProposalRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/proposals/${proposalId}/commit`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			(data as { error?: string })?.error ?? `Failed to commit proposal (${res.status})`
		);
	return data as ProposalRecord;
}

/** Server-side AI draft + P19 proposal (chat-intake marker; creator may approve in-app). */
export async function draftChatIntakeProposal(
	caseId: string,
	token: string,
	params: {
		raw_message: string;
		source_thread_id: string;
		source_message_id?: string | null;
		intake_kind: 'timeline' | 'note';
	}
): Promise<ProposalRecord> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/chat-intake/draft`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({
			raw_message: params.raw_message,
			source_thread_id: params.source_thread_id,
			source_message_id: params.source_message_id ?? undefined,
			intake_kind: params.intake_kind,
			source_scope: 'case'
		})
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			extractApiErrorMessage(data, `Failed to draft chat intake (${res.status})`)
		);
	return data as ProposalRecord;
}

export async function reviseChatIntakeProposal(
	caseId: string,
	proposalId: string,
	token: string,
	feedback: string
): Promise<ProposalRecord> {
	const res = await fetch(
		`${CASE_ENGINE_BASE_URL}/cases/${caseId}/chat-intake/proposals/${encodeURIComponent(proposalId)}/revise`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ feedback })
		}
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok)
		throw new Error(
			extractApiErrorMessage(data, `Failed to revise proposal (${res.status})`)
		);
	return data as ProposalRecord;
}

// ─── P19-14: Case Notebook Notes (working drafts) ─────────────────────────────
//
// Notebook notes are investigator working drafts scoped to a case.
// They are NOT official case records and must not be confused with the timeline.
// CRUD is private per-user (the backend enforces owner_user_id scoping).

export interface NotebookNote {
	/** Integer primary key returned by the backend. */
	id: number;
	case_id: string;
	owner_user_id: string;
	title: string | null;
	current_text: string;
	created_at: string;
	created_by: string;
	updated_at: string;
	updated_by: string;
	deleted_at: string | null;
	deleted_by: string | null;
}

/** List the current user's notebook notes for a case (owner-scoped by backend). */
export async function listCaseNotebookNotes(caseId: string, token: string): Promise<NotebookNote[]> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook`, {
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to load notes (${res.status})`);
	return data as NotebookNote[];
}

/** Create a new notebook note. Returns the created note. */
export async function createCaseNotebookNote(
	caseId: string,
	input: { title?: string | null; text: string },
	token: string
): Promise<NotebookNote> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(input)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to create note (${res.status})`);
	return data as NotebookNote;
}

/**
 * Update a notebook note by creating a new version (backend is versioned).
 * Returns the updated note row.
 */
export async function updateCaseNotebookNote(
	caseId: string,
	noteId: number,
	input: { title?: string | null; text: string },
	token: string
): Promise<NotebookNote> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/${noteId}/versions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify(input)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed to update note (${res.status})`);
	return data as NotebookNote;
}

/** Soft-delete a notebook note. */
export async function deleteCaseNotebookNote(
	caseId: string,
	noteId: number,
	token: string
): Promise<void> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/notebook/${noteId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new Error((data as { error?: string })?.error ?? `Failed to delete note (${res.status})`);
	}
}
