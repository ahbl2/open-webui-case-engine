/**
 * Case Engine API (Ticket 5) – separate from WebUI backend.
 * Proxied at /case-api by Caddy.
 */
import { CASE_ENGINE_BASE_URL } from '$lib/constants';

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
	topK?: number
): Promise<AskCaseQuestionResponse> {
	const res = await fetch(`${CASE_ENGINE_BASE_URL}/cases/${caseId}/ask`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ question: question.trim(), topK: topK ?? 8 })
	});
	const data = await res.json().catch(() => ({}));
	if (res.status === 422) {
		const err = new Error(data?.error ?? 'AI returned invalid response') as Error & { citations?: AskCitation[] };
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

export async function searchCases(
	params: { q: string; scope: SearchScope; caseId?: string; unit?: 'CID' | 'SIU' },
	token: string
): Promise<SearchResponse> {
	const sp = new URLSearchParams();
	sp.set('q', params.q);
	sp.set('scope', params.scope);
	if (params.caseId) sp.set('caseId', params.caseId);
	if (params.unit) sp.set('unit', params.unit);
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
