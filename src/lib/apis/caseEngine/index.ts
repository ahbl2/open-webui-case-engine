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
