/**
 * P98-03 / P98-05 — Files surface declared-relationship presentation (read-only).
 *
 * **Case file origin** has no declared-link builder in P98-01 (`buildCaseRecordRelationshipCollectionUnsupportedOrigin`
 * only). Do **not** infer or stitch relationships in the UI. When a read contract exists later, wire
 * `buildCaseRecordRelationshipCollectionFromCaseFile` (or equivalent) here — this module stays the
 * single Files adapter.
 */
import { buildCaseRecordRelationshipCollectionUnsupportedOrigin } from '$lib/case/caseRecordRelationshipReadModel';
import type { P98DeclaredRelationshipRow } from '$lib/case/p98DeclaredRelationshipPresentation';

export type FileP98DeclaredRelationshipRow = P98DeclaredRelationshipRow;

export interface FileP98DeclaredRelationshipsPresentation {
	readonly show: boolean;
	readonly heading: string;
	readonly footnote: string;
	readonly rows: readonly FileP98DeclaredRelationshipRow[];
	/** When true, contract layer has no file-origin builder (honest no-op in UI). */
	readonly originUnsupported: boolean;
}

/**
 * **Deterministic no-op** for standalone `case_file` rows until a read path exists. Never shows inferred UI.
 */
export function caseFileDeclaredRelationshipsPresentation(
	caseId: string,
	fileId: string
): FileP98DeclaredRelationshipsPresentation {
	const col = buildCaseRecordRelationshipCollectionUnsupportedOrigin(caseId, { kind: 'case_file', id: fileId });
	return {
		show: false,
		heading: '',
		footnote: '',
		rows: [],
		originUnsupported: col.empty_state === 'origin_unsupported'
	};
}
