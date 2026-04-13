/**
 * P114-04: Build `filters` for POST /cases/:id/query from explicit operator UI fields only.
 * No inference from question text; values passed through for Case Engine validation.
 */
import type { CaseQueryStructuredFilters } from '$lib/apis/caseEngine/caseQueryApi';

const FILTER_KEY_ORDER = [
	'type',
	'occurred_at_from',
	'occurred_at_to',
	'tags',
	'location_text'
] as const;

/** Mirrors Case Engine `hasActiveStructuredFilters` (P114-01 / P114-02). */
export function hasActiveStructuredFiltersUi(f?: CaseQueryStructuredFilters | null): boolean {
	if (f == null) return false;
	return (
		f.type !== undefined ||
		f.occurred_at_from !== undefined ||
		f.occurred_at_to !== undefined ||
		(f.tags !== undefined && f.tags.length > 0) ||
		f.location_text !== undefined
	);
}

/** Deterministic key order for stable JSON payloads. */
export function deterministicStructuredFiltersPayload(
	partial: CaseQueryStructuredFilters
): CaseQueryStructuredFilters {
	const out: CaseQueryStructuredFilters = {};
	for (const k of FILTER_KEY_ORDER) {
		if (k === 'tags') {
			if (partial.tags !== undefined && partial.tags.length > 0) {
				out.tags = [...partial.tags];
			}
			continue;
		}
		if (k === 'type' && partial.type !== undefined) out.type = partial.type;
		if (k === 'occurred_at_from' && partial.occurred_at_from !== undefined)
			out.occurred_at_from = partial.occurred_at_from;
		if (k === 'occurred_at_to' && partial.occurred_at_to !== undefined) out.occurred_at_to = partial.occurred_at_to;
		if (k === 'location_text' && partial.location_text !== undefined) out.location_text = partial.location_text;
	}
	return out;
}

export interface CaseQueryStructuredFiltersUiFields {
	typeToken: string;
	occurredAtFrom: string;
	occurredAtTo: string;
	tagsCommaSeparated: string;
	locationText: string;
}

/**
 * Map plain UI strings to a `filters` object. Returns `undefined` when no active predicate
 * (omit `filters` on the HTTP body — same as Phase 113 behavior).
 */
export function structuredFiltersFromUiFields(fields: CaseQueryStructuredFiltersUiFields): CaseQueryStructuredFilters | undefined {
	const type = fields.typeToken.trim();
	const occurred_at_from = fields.occurredAtFrom.trim();
	const occurred_at_to = fields.occurredAtTo.trim();
	const location_text = fields.locationText.trim();
	const tagParts = fields.tagsCommaSeparated
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	const partial: CaseQueryStructuredFilters = {};
	if (type.length > 0) partial.type = type;
	if (occurred_at_from.length > 0) partial.occurred_at_from = occurred_at_from;
	if (occurred_at_to.length > 0) partial.occurred_at_to = occurred_at_to;
	if (tagParts.length > 0) partial.tags = tagParts;
	if (location_text.length > 0) partial.location_text = location_text;

	if (!hasActiveStructuredFiltersUi(partial)) return undefined;
	return deterministicStructuredFiltersPayload(partial);
}
