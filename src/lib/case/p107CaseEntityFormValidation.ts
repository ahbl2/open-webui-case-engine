/**
 * P107-01 — Client-side validation aligned with Case Engine `caseEntitiesService` (Phase 105).
 * No inference: literal checks only; server remains authoritative on persist.
 */

export const P107_CASE_ENTITY_TYPE_MAX = 128;
export const P107_CASE_ENTITY_DISPLAY_LABEL_MAX = 2000;
export const P107_CASE_ENTITY_ATTRIBUTES_JSON_MAX = 65536;

/** Mirrors `CASE_ENTITY_TYPE_RESERVED_PREFIXES` (DetectiveCaseEngine). */
export const P107_CASE_ENTITY_TYPE_RESERVED_PREFIXES = [
	'case_intelligence',
	'cross_case',
	'global_entity',
	'promoted_timeline'
] as const;

export function validateCaseEntityTypeForSave(raw: string): { ok: true; value: string } | { ok: false; error: string } {
	const t = String(raw ?? '').trim();
	if (t.length === 0) {
		return { ok: false, error: 'entity_type is required' };
	}
	if (t.length > P107_CASE_ENTITY_TYPE_MAX) {
		return { ok: false, error: `entity_type must be at most ${P107_CASE_ENTITY_TYPE_MAX} characters` };
	}
	const lower = t.toLowerCase();
	for (const p of P107_CASE_ENTITY_TYPE_RESERVED_PREFIXES) {
		if (lower.startsWith(p)) {
			return {
				ok: false,
				error: `entity_type must not use reserved prefix "${p}" (Phase 105 / ENTITY_SYSTEM_CONSTRAINTS)`
			};
		}
	}
	return { ok: true, value: t };
}

export function validateDisplayLabelForSave(raw: string): { ok: true; value: string } | { ok: false; error: string } {
	const d = String(raw ?? '').trim();
	if (d.length === 0) {
		return { ok: false, error: 'display_label is required' };
	}
	if (d.length > P107_CASE_ENTITY_DISPLAY_LABEL_MAX) {
		return {
			ok: false,
			error: `display_label must be at most ${P107_CASE_ENTITY_DISPLAY_LABEL_MAX} characters`
		};
	}
	return { ok: true, value: d };
}

/**
 * Parse attributes from operator-entered JSON text. Empty/whitespace-only yields `{}`.
 */
export function parseCaseEntityAttributesJsonText(
	text: string
): { ok: true; attributes: Record<string, unknown> } | { ok: false; error: string } {
	const trimmed = String(text ?? '').trim();
	if (trimmed.length === 0) {
		return { ok: true, attributes: {} };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed) as unknown;
	} catch {
		return { ok: false, error: 'attributes must be valid JSON' };
	}
	if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return { ok: false, error: 'attributes must be a JSON object' };
	}
	const serial = JSON.stringify(parsed);
	if (serial.length > P107_CASE_ENTITY_ATTRIBUTES_JSON_MAX) {
		return {
			ok: false,
			error: `attributes JSON exceeds ${P107_CASE_ENTITY_ATTRIBUTES_JSON_MAX} characters`
		};
	}
	return { ok: true, attributes: parsed as Record<string, unknown> };
}
