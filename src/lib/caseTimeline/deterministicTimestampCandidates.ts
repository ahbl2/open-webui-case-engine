/**
 * P41-04 — Deterministic timestamp candidates from Case Engine (document ingest proposals).
 * UI-only parsing and presentation; Open WebUI is not authoritative for chronology.
 *
 * Contract: P41-03 `schema_version` 2 + `confidence_category` closed enum.
 */

export const DETERMINISTIC_TIMESTAMP_CONFIDENCE_CATEGORIES = [
	'exact_with_tz',
	'exact_no_tz',
	'date_only',
	'ambiguous',
	'partial'
] as const;

export type DeterministicTimestampConfidenceCategory =
	(typeof DETERMINISTIC_TIMESTAMP_CONFIDENCE_CATEGORIES)[number];

export type DeterministicTimestampCandidateV2 = {
	schema_version: number;
	raw_text: string;
	normalized_value: string | null;
	precision: string;
	confidence_category: DeterministicTimestampConfidenceCategory;
	evidence_start: number;
	evidence_end: number;
	evidence_excerpt: string;
	reason_codes: readonly string[];
	alternate_date_only_values?: readonly [string, string];
};

export type ParsedDeterministicCandidate =
	| { kind: 'v2'; candidate: DeterministicTimestampCandidateV2 }
	| { kind: 'legacy'; raw: Record<string, unknown> };

function isRecord(x: unknown): x is Record<string, unknown> {
	return x != null && typeof x === 'object' && !Array.isArray(x);
}

function isConfidenceCategory(x: unknown): x is DeterministicTimestampConfidenceCategory {
	return (
		typeof x === 'string' &&
		(DETERMINISTIC_TIMESTAMP_CONFIDENCE_CATEGORIES as readonly string[]).includes(x)
	);
}

/**
 * Parse `deterministic_timestamp_candidates` from a proposal payload.
 * Unknown `schema_version` entries are returned as `legacy` for safe display (no crash).
 */
export function parseDeterministicTimestampCandidatesFromPayload(
	payload: Record<string, unknown>
): ParsedDeterministicCandidate[] {
	const raw = payload['deterministic_timestamp_candidates'];
	if (!Array.isArray(raw) || raw.length === 0) return [];

	const out: ParsedDeterministicCandidate[] = [];
	for (const item of raw) {
		if (!isRecord(item)) continue;
		const sv = item['schema_version'];
		const cc = item['confidence_category'];
		if (sv === 2 && isConfidenceCategory(cc)) {
			const rawText = typeof item['raw_text'] === 'string' ? item['raw_text'] : '';
			const nv = item['normalized_value'];
			const normalized_value = nv == null ? null : typeof nv === 'string' ? nv : null;
			const precision = typeof item['precision'] === 'string' ? item['precision'] : 'partial';
			const es =
				typeof item['evidence_start'] === 'number' && Number.isFinite(item['evidence_start'])
					? item['evidence_start']
					: 0;
			const ee =
				typeof item['evidence_end'] === 'number' && Number.isFinite(item['evidence_end'])
					? item['evidence_end']
					: 0;
			const excerpt =
				typeof item['evidence_excerpt'] === 'string'
					? item['evidence_excerpt']
					: rawText;
			const rcRaw = item['reason_codes'];
			const reason_codes = Array.isArray(rcRaw)
				? rcRaw.filter((r): r is string => typeof r === 'string')
				: [];
			let alternate_date_only_values: [string, string] | undefined;
			const alt = item['alternate_date_only_values'];
			if (
				Array.isArray(alt) &&
				alt.length === 2 &&
				typeof alt[0] === 'string' &&
				typeof alt[1] === 'string'
			) {
				alternate_date_only_values = [alt[0], alt[1]];
			}
			out.push({
				kind: 'v2',
				candidate: {
					schema_version: 2,
					raw_text: rawText,
					normalized_value,
					precision,
					confidence_category: cc,
					evidence_start: es,
					evidence_end: ee,
					evidence_excerpt: excerpt,
					reason_codes,
					alternate_date_only_values
				}
			});
		} else {
			out.push({ kind: 'legacy', raw: item });
		}
	}
	return out;
}

/** Short operator-facing label for category badge. */
export function deterministicConfidenceCategoryShortLabel(
	category: DeterministicTimestampConfidenceCategory
): string {
	switch (category) {
		case 'exact_with_tz':
			return 'Exact (TZ)';
		case 'exact_no_tz':
			return 'Date+time (no TZ)';
		case 'date_only':
			return 'Date only';
		case 'ambiguous':
			return 'Ambiguous';
		case 'partial':
			return 'Partial';
		default:
			return category;
	}
}

export function deterministicConfidenceCategoryBadgeClasses(
	category: DeterministicTimestampConfidenceCategory
): string {
	switch (category) {
		case 'exact_with_tz':
			return 'bg-emerald-100 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100 border border-emerald-400/40';
		case 'exact_no_tz':
			return 'bg-cyan-100 text-cyan-950 dark:bg-cyan-950/45 dark:text-cyan-100 border border-cyan-500/35';
		case 'date_only':
			return 'bg-sky-100 text-sky-950 dark:bg-sky-950/45 dark:text-sky-100 border border-sky-500/35';
		case 'ambiguous':
			return 'bg-amber-100 text-amber-950 dark:bg-amber-950/45 dark:text-amber-100 border border-amber-500/40';
		case 'partial':
			return 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-200 border border-stone-500/30';
		default:
			return 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100';
	}
}

/** One-line explanation — not legal/factual certainty; review-only. */
export function deterministicCandidateOperatorNote(
	c: DeterministicTimestampCandidateV2
): string {
	switch (c.confidence_category) {
		case 'exact_with_tz':
			return 'Rule-based match: instant with explicit timezone in the excerpt. This is not the committed timeline time — compare to “Occurred at” above.';
		case 'exact_no_tz':
			return 'Date and clock time appear without a timezone in the excerpt. No UTC instant is inferred — set “Occurred at” yourself if you commit.';
		case 'date_only':
			return 'Calendar date only (no commit-grade clock instant). Align with “Occurred at” before commit if needed.';
		case 'ambiguous':
			return 'Slash date could be month-first or day-first. Both possibilities are listed — none is chosen for you.';
		case 'partial':
			if (c.reason_codes.includes('TIME_ONLY_NO_DATE')) {
				return 'Time without a date in the excerpt — incomplete for a timeline instant.';
			}
			if (c.reason_codes.includes('TWO_DIGIT_YEAR')) {
				return 'Two-digit year — century not guessed.';
			}
			if (c.reason_codes.includes('NUMERIC_SLASH_AMBIGUOUS')) {
				return 'Ambiguous numeric date — use alternates if shown, or correct “Occurred at”.';
			}
			return 'Incomplete or non-commit-grade span from deterministic rules — verify “Occurred at”.';
		default:
			return 'Review-only hint from source text.';
	}
}
