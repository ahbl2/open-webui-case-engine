import type { CaseSummaryEvidenceItem, CaseSummaryResult } from '$lib/apis/caseEngine';

/** Truncate excerpts for compact citation chips (P56-04). */
const CITATION_EXCERPT_MAX = 56;

/**
 * Map evidence pack items by `id` for citation label resolution. Uses only data already on the summary result.
 */
export function caseSummaryEvidenceByIdMap(result: CaseSummaryResult): Map<string, CaseSummaryEvidenceItem> {
	return new Map((result.evidencePack?.items ?? []).map((item) => [item.id, item]));
}

function citationKindLabel(kind: CaseSummaryEvidenceItem['kind']): string {
	return kind === 'timeline_entry' ? 'Entry' : 'File';
}

/**
 * Operator-scannable labels for citation `evidenceItemIds`: kind · sourceId, optional clipped excerpt.
 * Unknown ids fall back to the raw id string (no guessing).
 */
export function formatCaseSummaryCitationEvidenceLabels(
	ids: string[] | undefined,
	byId: Map<string, CaseSummaryEvidenceItem>
): string {
	const list = (ids ?? []).map((id) => String(id ?? '').trim()).filter(Boolean);
	if (list.length === 0) return '';

	return list
		.map((id) => {
			const item = byId.get(id);
			if (!item) return id;

			const head = `${citationKindLabel(item.kind)} · ${item.sourceId}`;
			const ex = String(item.excerpt ?? '').trim();
			if (!ex) return head;

			const clip = ex.length > CITATION_EXCERPT_MAX ? `${ex.slice(0, CITATION_EXCERPT_MAX - 1)}…` : ex;
			return `${head} · ${clip}`;
		})
		.join('; ');
}

export function detectCaseSummaryIntent(text: string): boolean {
	const q = String(text ?? '').toLowerCase().trim();
	if (!q) return false;
	return (
		/(summarize|summary)\b/.test(q) &&
		/(this case|case|generate|create|show|give me|provide)/.test(q)
	);
}

function sectionLines(title: string, items: string[] | undefined): string[] {
	const clean = (items ?? []).map((item) => String(item ?? '').trim()).filter(Boolean);
	if (clean.length === 0) return [];
	return [title, ...clean.map((item) => `- ${item}`)];
}

export function caseSummarySections(result: CaseSummaryResult): Array<{ title: string; items: string[] }> {
	const sections = result.summary;
	return [
		{ title: 'Primary suspects', items: sections?.primarySuspects ?? [] },
		{ title: 'Key events', items: sections?.keyEvents ?? [] },
		{ title: 'Evidence highlights', items: sections?.evidenceHighlights ?? [] },
		{ title: 'Recommended next steps', items: sections?.recommendedNextSteps ?? [] },
		{ title: 'Open questions', items: sections?.openQuestions ?? [] }
	].filter((section) => section.items.map((item) => String(item ?? '').trim()).filter(Boolean).length > 0);
}

export function hasLimitedCaseSummaryData(result: CaseSummaryResult): boolean {
	const sections = caseSummarySections(result);
	const itemCount = sections.reduce((sum, section) => sum + section.items.length, 0);
	return sections.length === 0 || itemCount <= 2;
}

export function formatCaseSummaryForChat(result: CaseSummaryResult): string {
	const lines: string[] = [];
	lines.push(`Case Summary (${result.generatedAt})`);
	lines.push('');

	for (const section of caseSummarySections(result)) {
		lines.push(...sectionLines(section.title, section.items));
	}

	if (Array.isArray(result.citations) && result.citations.length > 0) {
		const evidenceById = new Map(
			(result.evidencePack?.items ?? []).map((item) => [
				item.id,
				`${item.kind === 'timeline_entry' ? 'Entry' : 'File'}:${item.sourceId}`
			])
		);
		lines.push('Citations');
		for (const citation of result.citations) {
			const ids = (citation.evidenceItemIds ?? [])
				.map((id) => `${id}${evidenceById.has(id) ? ` (${evidenceById.get(id)})` : ''}`)
				.join(', ');
			if (ids) {
				lines.push(`- ${ids}${citation.note ? ` — ${citation.note}` : ''}`);
			}
		}
	}

	if (lines.filter((line) => line.startsWith('- ')).length === 0) {
		return 'No summary data returned.';
	}
	return lines.join('\n');
}
