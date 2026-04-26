import type { CaseFile } from '$lib/apis/caseEngine';

/** Case-scoped tag counts for the Files tags rail (client-side from file rows). */
export function aggregateTagCountsFromFiles(files: CaseFile[]): { tag: string; count: number }[] {
	const m = new Map<string, number>();
	for (const f of files) {
		for (const t of f.tags ?? []) {
			const k = t.trim();
			if (!k) continue;
			m.set(k, (m.get(k) ?? 0) + 1);
		}
	}
	return [...m.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
