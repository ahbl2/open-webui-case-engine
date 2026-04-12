/**
 * P100-01 — Deterministic entity extraction from a single source record’s text (read-only).
 *
 * Implementation notes:
 * - Regex-only; no ML, no randomness, no scoring.
 * - Under-capture is preferred: patterns are intentionally narrow; see per-type comments.
 * - Overlaps: within the same `entity_type`, overlapping spans are dropped (first match wins in
 *   start order). Different entity types may overlap — both are emitted.
 */

import type {
	CaseEntityExtractionMatch,
	CaseEntityExtractionResult,
	CaseEntityMatchSpan,
	CaseEntitySourceRecordInput,
	CaseEntityType
} from '$lib/case/p100EntityExtractionContract';
import {
	isCaseEntitySourceKind,
	P100_ENTITY_EXTRACTION_MODEL_V
} from '$lib/case/p100EntityExtractionContract';

/** First or second token blocklist — conservative two-token “name” pairs only. */
const PERSON_NAME_TOKEN_BLOCK = new Set([
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday',
	'January',
	'February',
	'March',
	'April',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
	'North',
	'South',
	'East',
	'West',
	'Case',
	'File',
	'Police',
	'Sheriff',
	'Report',
	'Witness',
	'Victim',
	'Suspect',
	'Evidence',
	'Interview',
	'Statement',
	'County',
	'State',
	'Federal',
	'United',
	'City',
	'Department',
	'Officer',
	'Detective'
]);

/** Two Title-Case ASCII tokens; conservative person-reference heuristic. */
const PERSON_NAME_RE = /\b([A-Z][a-z]{1,30})\s+([A-Z][a-z]{1,30})\b/g;

/**
 * US-style phone; avoids bare 10-digit runs that are not phone-shaped.
 * No leading `\b` — NANP numbers often start with `(` after optional `+1`.
 */
const PHONE_RE = /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

/**
 * Street address fragment: number + limited middle + suffix. Middle segment is bounded to reduce
 * backtracking and over-capture into following sentences.
 */
const ADDRESS_RE =
	/\b(\d{1,5})\s+([A-Za-z0-9#.-]+(?:\s+[A-Za-z0-9#.-]+){0,4})\s+(Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Court|Ct\.?|Way)\b/gi;

/** VIN: 17 chars, excludes I/O/Q per ISO 3779; must follow explicit VIN label. */
const VIN_LABELED_RE = /\bVIN\s*[:\s#-]*\s*([A-HJ-NPR-Z0-9]{17})\b/gi;

/** Requires literal “Plate” / “plate” prefix to avoid unconstrained plate guessing. */
const PLATE_LABELED_RE = /\bPlate\s*[:#]?\s*([A-Z0-9]{2,10}(?:\s*[-\s]\s*[A-Z0-9]{2,10})?)\b/gi;

const UUID_RE =
	/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g;

/** Hyphenated numeric reference style (e.g. dossier fragments); narrow length. */
const HYPHEN_NUMERIC_ID_RE = /\b\d{4}-\d{2}-\d{6}\b/g;

/** Prefix + digits id segment (letters, hyphen, digits). */
const PREFIX_CODE_RE = /\b[A-Z]{2,4}-\d{5,8}\b/g;

interface LocalMatch {
	readonly entity_type: CaseEntityType;
	readonly raw_text: string;
	readonly normalized_display: string | null;
	readonly span: CaseEntityMatchSpan;
}

function nonOverlappingBySpan(matches: LocalMatch[]): LocalMatch[] {
	const sorted = [...matches].sort((x, y) => x.span.start - y.span.start || x.span.end - y.span.end);
	const out: LocalMatch[] = [];
	let lastEnd = -1;
	for (const m of sorted) {
		if (m.span.start < lastEnd) continue;
		out.push(m);
		lastEnd = m.span.end;
	}
	return out;
}

function extractPersonNames(text: string): LocalMatch[] {
	const out: LocalMatch[] = [];
	let m: RegExpExecArray | null;
	const re = new RegExp(PERSON_NAME_RE.source, PERSON_NAME_RE.flags);
	while ((m = re.exec(text)) !== null) {
		const first = m[1]!;
		const second = m[2]!;
		if (PERSON_NAME_TOKEN_BLOCK.has(first) || PERSON_NAME_TOKEN_BLOCK.has(second)) continue;
		const raw = m[0]!;
		const span = { start: m.index, end: m.index + raw.length };
		const normalized_display = `${first} ${second}`;
		out.push({
			entity_type: 'person_name',
			raw_text: raw,
			normalized_display: normalized_display === raw ? null : normalized_display,
			span
		});
	}
	return nonOverlappingBySpan(out);
}

function digitsOnly(s: string): string {
	return s.replace(/\D/g, '');
}

function normalizePhone(raw: string): string | null {
	const d = digitsOnly(raw);
	if (d.length === 11 && d.startsWith('1')) {
		const ten = d.slice(1);
		if (ten.length === 10) return `${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`;
	}
	if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
	return null;
}

function extractPhones(text: string): LocalMatch[] {
	const out: LocalMatch[] = [];
	let m: RegExpExecArray | null;
	const re = new RegExp(PHONE_RE.source, PHONE_RE.flags);
	while ((m = re.exec(text)) !== null) {
		const raw = m[0]!;
		const norm = normalizePhone(raw);
		if (!norm) continue;
		const span = { start: m.index, end: m.index + raw.length };
		out.push({
			entity_type: 'phone_number',
			raw_text: raw,
			normalized_display: norm === raw.trim() ? null : norm,
			span
		});
	}
	return nonOverlappingBySpan(out);
}

function collapseInnerSpace(s: string): string {
	return s.replace(/\s+/g, ' ').trim();
}

function extractAddresses(text: string): LocalMatch[] {
	const out: LocalMatch[] = [];
	let m: RegExpExecArray | null;
	const re = new RegExp(ADDRESS_RE.source, ADDRESS_RE.flags);
	while ((m = re.exec(text)) !== null) {
		const raw = m[0]!;
		const span = { start: m.index, end: m.index + raw.length };
		const norm = collapseInnerSpace(raw);
		out.push({
			entity_type: 'address',
			raw_text: raw,
			normalized_display: norm === raw ? null : norm,
			span
		});
	}
	return nonOverlappingBySpan(out);
}

function extractVehicles(text: string): LocalMatch[] {
	const out: LocalMatch[] = [];

	let v: RegExpExecArray | null;
	const vinRe = new RegExp(VIN_LABELED_RE.source, VIN_LABELED_RE.flags);
	while ((v = vinRe.exec(text)) !== null) {
		const vinPart = v[1]!;
		const vinUpper = vinPart.toUpperCase();
		const raw = v[0]!;
		const span = { start: v.index, end: v.index + raw.length };
		out.push({
			entity_type: 'vehicle',
			raw_text: raw,
			normalized_display: vinUpper === vinPart ? null : vinUpper,
			span
		});
	}

	let p: RegExpExecArray | null;
	const plateRe = new RegExp(PLATE_LABELED_RE.source, PLATE_LABELED_RE.flags);
	while ((p = plateRe.exec(text)) !== null) {
		const raw = p[0]!;
		const span = { start: p.index, end: p.index + raw.length };
		const captured = p[1]!.replace(/\s+/g, '');
		const plateNorm = captured.toUpperCase();
		out.push({
			entity_type: 'vehicle',
			raw_text: raw,
			normalized_display: plateNorm === captured ? null : plateNorm,
			span
		});
	}

	return nonOverlappingBySpan(out);
}

function extractSimpleIdentifiers(text: string): LocalMatch[] {
	const out: LocalMatch[] = [];

	let u: RegExpExecArray | null;
	const uuidRe = new RegExp(UUID_RE.source, UUID_RE.flags);
	while ((u = uuidRe.exec(text)) !== null) {
		const raw = u[0]!;
		const span = { start: u.index, end: u.index + raw.length };
		const lower = raw.toLowerCase();
		out.push({
			entity_type: 'simple_identifier',
			raw_text: raw,
			normalized_display: lower === raw ? null : lower,
			span
		});
	}

	let h: RegExpExecArray | null;
	const hypRe = new RegExp(HYPHEN_NUMERIC_ID_RE.source, HYPHEN_NUMERIC_ID_RE.flags);
	while ((h = hypRe.exec(text)) !== null) {
		const raw = h[0]!;
		const span = { start: h.index, end: h.index + raw.length };
		out.push({ entity_type: 'simple_identifier', raw_text: raw, normalized_display: null, span });
	}

	let c: RegExpExecArray | null;
	const prefRe = new RegExp(PREFIX_CODE_RE.source, PREFIX_CODE_RE.flags);
	while ((c = prefRe.exec(text)) !== null) {
		const raw = c[0]!;
		const span = { start: c.index, end: c.index + raw.length };
		out.push({ entity_type: 'simple_identifier', raw_text: raw, normalized_display: null, span });
	}

	return nonOverlappingBySpan(out);
}

const ENTITY_TYPE_ORDER: readonly CaseEntityType[] = [
	'address',
	'person_name',
	'phone_number',
	'simple_identifier',
	'vehicle'
];

function stableSortMatches(matches: CaseEntityExtractionMatch[]): CaseEntityExtractionMatch[] {
	const typeOrderIndex = (t: CaseEntityType) => ENTITY_TYPE_ORDER.indexOf(t);
	return [...matches].sort((a, b) => {
		if (a.span.start !== b.span.start) return a.span.start - b.span.start;
		if (a.span.end !== b.span.end) return a.span.end - b.span.end;
		return typeOrderIndex(a.entity_type) - typeOrderIndex(b.entity_type);
	});
}

function toFinal(
	input: CaseEntitySourceRecordInput,
	locals: LocalMatch[]
): CaseEntityExtractionMatch[] {
	return locals.map(
		(l) =>
			({
				v: P100_ENTITY_EXTRACTION_MODEL_V,
				case_id: input.case_id,
				source_kind: input.source_kind,
				source_record_id: input.source_record_id,
				entity_type: l.entity_type,
				raw_text: l.raw_text,
				normalized_display: l.normalized_display,
				span: l.span
			}) satisfies CaseEntityExtractionMatch
	);
}

/**
 * Extract all supported entity types from one record’s text. **No cross-record merging.**
 * Invalid / empty ids or unknown `source_kind` → empty result (quiet, predictable).
 */
export function extractCaseEntitiesFromSourceText(
	input: CaseEntitySourceRecordInput
): CaseEntityExtractionResult {
	const caseId = input.case_id?.trim() ?? '';
	const recordId = input.source_record_id?.trim() ?? '';
	if (!caseId || !recordId || !isCaseEntitySourceKind(input.source_kind)) {
		return { matches: [] };
	}

	const text = input.text ?? '';
	const bounded: CaseEntitySourceRecordInput = {
		case_id: caseId,
		source_kind: input.source_kind,
		source_record_id: recordId,
		text
	};

	const locals: LocalMatch[] = [
		...extractPersonNames(text),
		...extractPhones(text),
		...extractAddresses(text),
		...extractVehicles(text),
		...extractSimpleIdentifiers(text)
	];

	const finals = toFinal(bounded, locals);
	return { matches: stableSortMatches(finals) };
}
