/**
 * P98-02 / P98-05 — Timeline-only declared-relationship presentation (read-only).
 *
 * Maps P98-01 `CaseRecordRelationshipCollection` for `timeline_entry` origins into compact copy for
 * {@link TimelineEntryDeclaredRelationshipsBlock}. No navigation, no inference, no extra filtering
 * beyond the contract. Later tickets add builders only when a Case Engine read contract exists.
 */
import type { TimelineEntry } from '$lib/apis/caseEngine';
import {
	buildCaseRecordRelationshipCollectionFromTimelineEntry,
	DECLARED_RELATIONSHIP_UI_COPY
} from '$lib/case/caseRecordRelationshipReadModel';
import {
	assertP98DeclaredRelationshipCopyPassesGuard,
	mapDeclaredItemsToPresentationRows,
	P98_TARGET_UNAVAILABLE_NOTE,
	type P98DeclaredRelationshipRow,
	rowPrimaryLineFromDeclaredItem,
	declaredTargetKindShortLabel
} from '$lib/case/p98DeclaredRelationshipPresentation';

/** @deprecated Use {@link P98_TARGET_UNAVAILABLE_NOTE} — kept for P98-02 tests and imports. */
export const TIMELINE_P98_TARGET_UNAVAILABLE_NOTE = P98_TARGET_UNAVAILABLE_NOTE;

export { declaredTargetKindShortLabel, rowPrimaryLineFromDeclaredItem };

export type TimelineP98DeclaredRelationshipRow = P98DeclaredRelationshipRow;

export interface TimelineP98DeclaredRelationshipsPresentation {
	readonly show: boolean;
	readonly heading: string;
	readonly footnote: string;
	readonly rows: readonly TimelineP98DeclaredRelationshipRow[];
}

export function timelineEntryDeclaredRelationshipsPresentation(
	caseId: string,
	entry: TimelineEntry
): TimelineP98DeclaredRelationshipsPresentation {
	const col = buildCaseRecordRelationshipCollectionFromTimelineEntry(caseId, entry);
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

export function assertTimelineP98DeclaredCopyPassesGuard(label: string, context: string): void {
	assertP98DeclaredRelationshipCopyPassesGuard(label, context);
}
