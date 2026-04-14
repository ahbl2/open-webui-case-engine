/**
 * P130-02 — Controlled read-only case data ingestion for AI Workspace.
 *
 * - GET-only Case Engine APIs; no POST/PUT/DELETE.
 * - Single case scope: `case_id` must be non-empty (route-derived).
 * - Sequential fetches (no uncontrolled parallel fan-out).
 * - Deterministic caps per source; Timeline order follows server (occurred_at ASC).
 * - File list via paginated GET; optional GET /files/:id/text per file (capped count).
 *
 * Does not call Activity/Audit, Ask, or LLM endpoints.
 */
import {
	getCaseFileText,
	listCaseFilesPage,
	listCaseNotebookNotes,
	listCaseTimelineEntries
} from '$lib/apis/caseEngine';
import { getCaseEntitiesList } from '$lib/apis/caseEngine/caseEntitiesApi';
import { listCaseWorkflowItems } from '$lib/apis/caseEngine/caseWorkflowItemsApi';

import type { CaseRetrievalBundle, CaseRetrievalFileRow } from '$lib/case/caseRetrievalBundleTypes';

/** Per-source caps (deterministic; no ranking — truncation only). */
export const CASE_RETRIEVAL_LIMITS = {
	maxTimelineEntries: 2000,
	maxNotes: 500,
	maxFilesListed: 100,
	/** Max files for which we attempt GET /files/:id/text (sequential). */
	maxFileTextFetch: 25,
	maxEntities: 500,
	maxWorkflowRows: 500
} as const;

function requireCaseId(caseId: string): string {
	const cid = String(caseId ?? '').trim();
	if (!cid) {
		throw new Error('case_id is required');
	}
	return cid;
}

function requireToken(token: string): string {
	const t = String(token ?? '').trim();
	if (!t) {
		throw new Error('Case Engine token is required');
	}
	return t;
}

/**
 * Assembles a read-only retrieval bundle for the given case using existing GET endpoints only.
 *
 * @param caseId - Route case id (This Case only; no cross-case).
 * @param token - Case Engine JWT (same as other case workspace calls).
 */
export async function buildCaseRetrievalBundle(
	caseId: string,
	token: string,
	options?: { retrievedAtIso?: string }
): Promise<CaseRetrievalBundle> {
	const cid = requireCaseId(caseId);
	const tok = requireToken(token);
	const retrieved_at = options?.retrievedAtIso ?? new Date().toISOString();

	const timelineRaw = await listCaseTimelineEntries(cid, tok);
	const timeline = timelineRaw.slice(0, CASE_RETRIEVAL_LIMITS.maxTimelineEntries);

	const notesRaw = await listCaseNotebookNotes(cid, tok);
	const notes = notesRaw.slice(0, CASE_RETRIEVAL_LIMITS.maxNotes);

	const filesPage = await listCaseFilesPage(cid, tok, {
		limit: CASE_RETRIEVAL_LIMITS.maxFilesListed,
		offset: 0
	});

	const files: CaseRetrievalFileRow[] = [];
	for (let i = 0; i < filesPage.files.length; i++) {
		const f = filesPage.files[i]!;
		const row: CaseRetrievalFileRow = { ...f };
		if (i < CASE_RETRIEVAL_LIMITS.maxFileTextFetch) {
			try {
				const t = await getCaseFileText(f.id, tok);
				row.extracted_text = t.extracted_text ?? null;
			} catch (e: unknown) {
				row.file_text_error = e instanceof Error ? e.message : String(e);
			}
		}
		files.push(row);
	}

	const entitiesRaw = await getCaseEntitiesList(cid, tok);
	const entities = entitiesRaw.slice(0, CASE_RETRIEVAL_LIMITS.maxEntities);

	const workflowRaw = await listCaseWorkflowItems(cid, tok);
	const workflow = workflowRaw.slice(0, CASE_RETRIEVAL_LIMITS.maxWorkflowRows);

	return {
		case_id: cid,
		retrieved_at,
		sources: {
			timeline,
			notes,
			files,
			entities,
			workflow
		}
	};
}
