/**
 * Lightweight intent gate for case chat: proposal workflow vs askCase Q&A.
 * Triggers only on explicit phrases (substring match, case-insensitive).
 */
export type ChatIntakeKind = 'timeline' | 'note';

export function detectCaseChatIntakeIntent(text: string): { kind: ChatIntakeKind } | null {
	const t = text.trim().toLowerCase();
	if (!t) return null;

	const rules: Array<{ phrase: string; kind: ChatIntakeKind }> = [
		{ phrase: 'add to timeline', kind: 'timeline' },
		{ phrase: 'record this', kind: 'timeline' },
		{ phrase: 'log this', kind: 'timeline' },
		{ phrase: 'create note', kind: 'note' },
		{ phrase: 'clean this up', kind: 'timeline' }
	];

	for (const { phrase, kind } of rules) {
		if (t.includes(phrase)) return { kind };
	}
	return null;
}

/** Client-side mirror of Case Engine occurred_at rule (approve only when commit will succeed). */
export function isIsoOccurredAtWithTimezone(value: string | null | undefined): boolean {
	if (value == null || typeof value !== 'string') return false;
	const s = value.trim();
	if (!s) return false;
	return (
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s) && !Number.isNaN(new Date(s).getTime())
	);
}
