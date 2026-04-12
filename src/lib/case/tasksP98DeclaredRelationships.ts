/**
 * P98-03 / P98-05 — Tasks surface declared-relationship presentation (read-only).
 *
 * Maps P98-01 `buildCaseRecordRelationshipCollectionFromCaseTask` into UI rows. No navigation,
 * no extra filtering beyond the contract.
 */
import type { CaseTask } from '$lib/case/caseTaskModel';
import {
	buildCaseRecordRelationshipCollectionFromCaseTask,
	DECLARED_RELATIONSHIP_UI_COPY
} from '$lib/case/caseRecordRelationshipReadModel';
import {
	assertP98DeclaredRelationshipCopyPassesGuard,
	mapDeclaredItemsToPresentationRows,
	type P98DeclaredRelationshipRow
} from '$lib/case/p98DeclaredRelationshipPresentation';

export type TaskP98DeclaredRelationshipRow = P98DeclaredRelationshipRow;

export interface TaskP98DeclaredRelationshipsPresentation {
	readonly show: boolean;
	readonly heading: string;
	readonly footnote: string;
	readonly rows: readonly TaskP98DeclaredRelationshipRow[];
}

export function taskDeclaredRelationshipsPresentation(
	caseId: string,
	task: CaseTask
): TaskP98DeclaredRelationshipsPresentation {
	const col = buildCaseRecordRelationshipCollectionFromCaseTask(caseId, task);
	if (col.empty_state !== 'populated' || col.items.length === 0) {
		return { show: false, heading: '', footnote: '', rows: [] };
	}
	return {
		show: true,
		heading: DECLARED_RELATIONSHIP_UI_COPY.sectionHeading,
		footnote: DECLARED_RELATIONSHIP_UI_COPY.supportingContextFootnote,
		rows: mapDeclaredItemsToPresentationRows(col.items)
	};
}

export function assertTaskP98DeclaredCopyPassesGuard(label: string, context: string): void {
	assertP98DeclaredRelationshipCopyPassesGuard(label, context);
}
