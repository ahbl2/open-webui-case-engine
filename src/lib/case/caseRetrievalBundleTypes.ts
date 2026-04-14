/**
 * P130-02 — Client-only case retrieval bundle for AI Workspace (read-only ingestion).
 * No persistence; not authoritative over Timeline.
 */
import type { CaseFile, NotebookNote, TimelineEntry } from '$lib/apis/caseEngine';
import type { CaseEngineCaseEntity } from '$lib/apis/caseEngine/caseEntitiesApi';
import type { CaseEngineCaseWorkflowItem } from '$lib/apis/caseEngine/caseWorkflowItemsApi';

/** File row with optional GET /files/:id/text payload (read-only). */
export interface CaseRetrievalFileRow extends CaseFile {
	extracted_text?: string | null;
	/** Present when extracted text could not be loaded (still read-only; no mutation). */
	file_text_error?: string | null;
}

/**
 * Single-case, in-memory bundle assembled from sequential GET-only Case Engine calls.
 */
export interface CaseRetrievalBundle {
	case_id: string;
	/** ISO 8601 instant when the bundle was assembled (client clock). */
	retrieved_at: string;
	sources: {
		timeline: TimelineEntry[];
		notes: NotebookNote[];
		files: CaseRetrievalFileRow[];
		entities: CaseEngineCaseEntity[];
		workflow: CaseEngineCaseWorkflowItem[];
	};
}
