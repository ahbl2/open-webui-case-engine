/**
 * Shared Phase 98 declared-relationship row copy (read-only). Used by Timeline, Tasks, and Files surfaces.
 * P98-05 — consolidated navigate aria labels, region aria, unavailable note, and copy guard helpers here
 * so surfaces stay aligned without new routing or contract changes.
 */
import type { DeclaredRecordKind, DeclaredRelationshipItem } from '$lib/case/caseRecordRelationshipReadModel';
import {
	CASE_RECORD_RELATIONSHIP_MODEL_V,
	containsForbiddenRelationshipDisplayTerm,
	DECLARED_RELATIONSHIP_UI_COPY
} from '$lib/case/caseRecordRelationshipReadModel';

/** Single source: {@link DECLARED_RELATIONSHIP_UI_COPY.targetUnavailableNote} */
export const P98_TARGET_UNAVAILABLE_NOTE = DECLARED_RELATIONSHIP_UI_COPY.targetUnavailableNote;

/** Region `aria-label` for declared-connections strips (Timeline / Tasks; Files when populated). */
export const P98_DECLARED_RELATIONSHIP_REGION_ARIA = DECLARED_RELATIONSHIP_UI_COPY.regionAriaLabel;

export function assertP98DeclaredRelationshipCopyPassesGuard(label: string, context: string): void {
	if (containsForbiddenRelationshipDisplayTerm(label)) {
		throw new Error(`P98 declared relationship copy guard: forbidden fragment in ${context}`);
	}
}

export function declaredTargetKindShortLabel(kind: DeclaredRecordKind): string {
	switch (kind) {
		case 'case_file':
			return 'Supporting file';
		case 'timeline_entry':
			return 'Timeline entry';
		case 'case_task':
			return 'Task';
		case 'notebook_note':
			return 'Notebook note';
		default: {
			const _e: never = kind;
			return _e;
		}
	}
}

export function rowPrimaryLineFromDeclaredItem(item: DeclaredRelationshipItem): string {
	if (item.v !== CASE_RECORD_RELATIONSHIP_MODEL_V) return '';
	const kind = declaredTargetKindShortLabel(item.target.kind);
	const label = item.label_from_engine?.trim() ?? '';
	const id = item.target.id.trim();
	const shown = label.length > 0 ? label : id;
	return `${kind} · ${shown}`;
}

export interface P98DeclaredRelationshipRow {
	readonly relationship_key: string;
	readonly primaryLine: string;
	readonly availabilityNote: string | null;
	/** Target identity for P98-04 same-case navigation (no heuristic re-resolve). */
	readonly target_kind: DeclaredRecordKind;
	readonly target_id: string;
	/** True only when engine reports `available` and ids are present — else inert (P98-04). */
	readonly navigable: boolean;
}

export function isDeclaredRelationshipTargetNavigable(item: DeclaredRelationshipItem): boolean {
	if (item.v !== CASE_RECORD_RELATIONSHIP_MODEL_V) return false;
	if (item.target_availability !== 'available') return false;
	if (!item.target.id?.trim()) return false;
	return true;
}

export function mapDeclaredItemsToPresentationRows(
	items: readonly DeclaredRelationshipItem[]
): P98DeclaredRelationshipRow[] {
	return items.map((it) => ({
		relationship_key: it.relationship_key,
		primaryLine: rowPrimaryLineFromDeclaredItem(it),
		availabilityNote: it.target_availability === 'unavailable' ? P98_TARGET_UNAVAILABLE_NOTE : null,
		target_kind: it.target.kind,
		target_id: it.target.id.trim(),
		navigable: isDeclaredRelationshipTargetNavigable(it)
	}));
}

/**
 * Factual control copy — not workflow guidance (P98-01 copy guard: avoid causal phrasing).
 * Consolidated in presentation (P98-05) so Timeline / Tasks / navigation stay aligned.
 */
export const P98_DECLARED_NAVIGATE_ARIA_LABEL_BY_KIND: Record<DeclaredRecordKind, string> = {
	timeline_entry: 'Open this Timeline entry in the Timeline tab',
	case_task: 'Open this task in the Tasks tab',
	case_file: 'Open this file in the Files tab',
	notebook_note: 'Open this note in the Notes tab'
};

export function p98DeclaredRelationshipNavigateAriaLabel(
	row: Pick<P98DeclaredRelationshipRow, 'target_kind'>
): string {
	return P98_DECLARED_NAVIGATE_ARIA_LABEL_BY_KIND[row.target_kind];
}
