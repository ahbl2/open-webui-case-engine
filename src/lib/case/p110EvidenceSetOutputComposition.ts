/**
 * P110-03 — Deterministic output composition rules for evidence set expansion.
 *
 * Rules (aligned with Case Engine P110-01):
 * - Timeline entries: sort by `occurred_at` ascending (lexicographic on stored strings), tie-break `source_id` ascending.
 * - Files: sort by `source_id` ascending.
 * - Membership traceability list: sort by `item_kind` then `source_id` (matches server-side stable ordering).
 * - No merging of timeline and files into one stream.
 * - No rewriting of `text_original` or other source fields (presentation may format dates separately in UI only).
 *
 * All functions are pure; they return new arrays/objects and do not mutate inputs.
 */
import type {
	CaseEngineEvidenceSetExpanded,
	CaseEngineExpandedTimelineEntry,
	CaseEngineExpandedCaseFile
} from '$lib/apis/caseEngine/evidenceSetsApi';

export const P110_COMPOSITION_RULES_VERSION = 1 as const;

/** Stable plain-text header for serialized output (P110-04 copy/download). */
export const P110_PLAIN_TEXT_HEADER_LINE = 'Case Engine — evidence set output (read-only)';

export function sortTimelineEntriesDeterministic(
	entries: CaseEngineExpandedTimelineEntry[]
): CaseEngineExpandedTimelineEntry[] {
	return [...entries].sort((a, b) => {
		const o = a.occurred_at.localeCompare(b.occurred_at);
		if (o !== 0) return o;
		return a.source_id.localeCompare(b.source_id);
	});
}

export function sortFilesDeterministic(files: CaseEngineExpandedCaseFile[]): CaseEngineExpandedCaseFile[] {
	return [...files].sort((a, b) => a.source_id.localeCompare(b.source_id));
}

export function sortMembershipDeterministic(
	membership: Array<{ item_kind: 'timeline_entry' | 'file'; source_id: string }>
): Array<{ item_kind: 'timeline_entry' | 'file'; source_id: string }> {
	return [...membership].sort((a, b) => {
		const k = a.item_kind.localeCompare(b.item_kind);
		if (k !== 0) return k;
		return a.source_id.localeCompare(b.source_id);
	});
}

/**
 * Canonical read model for preview and plain-text serialization: explicit ordering only.
 * Idempotent when the server already returns sorted arrays.
 */
export function composeDeterministicEvidenceSetOutput(
	expanded: CaseEngineEvidenceSetExpanded
): CaseEngineEvidenceSetExpanded {
	return {
		evidence_set: expanded.evidence_set,
		timeline_entries: sortTimelineEntriesDeterministic(expanded.timeline_entries),
		files: sortFilesDeterministic(expanded.files),
		membership: sortMembershipDeterministic(expanded.membership)
	};
}

/**
 * Deterministic plain-text snapshot of the composed output (verbatim source fields; `\n` line endings).
 * Intended for P110-04 clipboard / download; same input yields the same string.
 */
export function serializeDeterministicPlainTextOutput(expanded: CaseEngineEvidenceSetExpanded): string {
	const c = composeDeterministicEvidenceSetOutput(expanded);
	const lines: string[] = [];
	lines.push(P110_PLAIN_TEXT_HEADER_LINE);
	lines.push('');
	lines.push(`evidence_set.id=${c.evidence_set.id}`);
	lines.push(`evidence_set.case_id=${c.evidence_set.case_id}`);
	lines.push(`evidence_set.name=${c.evidence_set.name}`);
	lines.push(`evidence_set.created_at=${c.evidence_set.created_at}`);
	lines.push(`evidence_set.created_by=${c.evidence_set.created_by}`);
	lines.push('');
	lines.push('[timeline]');
	for (const e of c.timeline_entries) {
		lines.push(`occurred_at=${e.occurred_at}`);
		lines.push(`type=${e.type}`);
		lines.push(`source_id=${e.source_id}`);
		lines.push(`created_at=${e.created_at}`);
		lines.push(`created_by=${e.created_by}`);
		lines.push('text_original:');
		lines.push(e.text_original);
		lines.push('');
	}
	lines.push('[files]');
	for (const f of c.files) {
		lines.push(`source_id=${f.source_id}`);
		lines.push(`original_filename=${f.original_filename}`);
		lines.push(`mime_type=${f.mime_type ?? ''}`);
		lines.push(`uploaded_by=${f.uploaded_by}`);
		lines.push(`uploaded_at=${f.uploaded_at}`);
		lines.push(`created_at=${f.created_at}`);
		lines.push('');
	}
	lines.push('[membership]');
	for (const m of c.membership) {
		lines.push(`item_kind=${m.item_kind}`);
		lines.push(`source_id=${m.source_id}`);
	}
	return lines.join('\n');
}
