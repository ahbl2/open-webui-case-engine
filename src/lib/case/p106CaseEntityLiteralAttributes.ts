/**
 * P106-03 — Present only primitive attribute values as literal strings (no JSON blobs, no interpretation).
 */

export function p106LiteralAttributeRows(
	attributes: Record<string, unknown>
): { key: string; value: string }[] {
	const rows: { key: string; value: string }[] = [];
	for (const [k, v] of Object.entries(attributes)) {
		if (v === null || v === undefined) continue;
		if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
			rows.push({ key: k, value: String(v) });
		}
	}
	rows.sort((a, b) => a.key.localeCompare(b.key));
	return rows;
}
