import { describe, expect, it } from 'vitest';
import {
	caseSummaryEvidenceByIdMap,
	formatCaseSummaryCitationEvidenceLabels
} from './caseSummary';
import type { CaseSummaryResult } from '$lib/apis/caseEngine';

function makeResult(partial: Partial<CaseSummaryResult> & { items: CaseSummaryResult['evidencePack']['items'] }): CaseSummaryResult {
	return {
		caseId: 'c1',
		generatedAt: '2020-01-01T00:00:00.000Z',
		params: { maxSources: 10, maxTextPerSource: 100 },
		evidencePack: { packVersion: 1, items: partial.items },
		summary: partial.summary ?? {
			primarySuspects: [],
			keyEvents: [],
			evidenceHighlights: [],
			recommendedNextSteps: [],
			openQuestions: []
		},
		citations: partial.citations ?? []
	};
}

describe('formatCaseSummaryCitationEvidenceLabels', () => {
	it('uses evidence pack for kind, sourceId, and clipped excerpt', () => {
		const r = makeResult({
			items: [
				{
					id: 'ev-a',
					kind: 'timeline_entry',
					sourceId: 'ent-1',
					type: 'OBSERVATION',
					createdAt: '2020-01-01T00:00:00.000Z',
					excerpt: 'Short line'
				}
			]
		});
		const map = caseSummaryEvidenceByIdMap(r);
		expect(formatCaseSummaryCitationEvidenceLabels(['ev-a'], map)).toBe(
			'Entry · ent-1 · Short line'
		);
	});

	it('falls back to raw id when pack has no entry', () => {
		const r = makeResult({ items: [] });
		const map = caseSummaryEvidenceByIdMap(r);
		expect(formatCaseSummaryCitationEvidenceLabels(['missing-id'], map)).toBe('missing-id');
	});

	it('uses File kind label for case_file', () => {
		const r = makeResult({
			items: [
				{
					id: 'f1',
					kind: 'case_file',
					sourceId: 'file-uuid',
					type: 'pdf',
					createdAt: '2020-01-01T00:00:00.000Z',
					excerpt: ''
				}
			]
		});
		const map = caseSummaryEvidenceByIdMap(r);
		expect(formatCaseSummaryCitationEvidenceLabels(['f1'], map)).toBe('File · file-uuid');
	});
});
