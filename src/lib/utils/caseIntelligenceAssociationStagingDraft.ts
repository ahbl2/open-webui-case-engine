/**
 * Shared helpers for Case Intelligence association staging create (P66 / P67-07).
 * Mirrors Case Engine client rules used in Stage 2 pilot — no alternate workflow.
 */

export function canonicalizeAssociatedWithEndpoints(
	a: string,
	b: string
): { endpoint_a_entity_id: string; endpoint_b_entity_id: string } {
	if (a.localeCompare(b) < 0) return { endpoint_a_entity_id: a, endpoint_b_entity_id: b };
	return { endpoint_a_entity_id: b, endpoint_b_entity_id: a };
}

export function parsePlainObjectJson(raw: string, fieldLabel: string): Record<string, unknown> {
	const t = raw.trim() || '{}';
	let o: unknown;
	try {
		o = JSON.parse(t);
	} catch {
		throw new Error(`${fieldLabel} must be valid JSON.`);
	}
	if (o === null || typeof o !== 'object' || Array.isArray(o)) {
		throw new Error(`${fieldLabel} must be a JSON object.`);
	}
	return o as Record<string, unknown>;
}
