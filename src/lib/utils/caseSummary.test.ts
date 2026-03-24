import { describe, expect, it } from 'vitest';
import {
	caseSummarySections,
	detectCaseSummaryIntent,
	formatCaseSummaryForChat,
	hasLimitedCaseSummaryData
} from './caseSummary';
import type { CaseSummaryResult } from '$lib/apis/caseEngine';

describe('caseSummary helpers', () => {
	it('detects explicit case summary intent', () => {
		expect(detectCaseSummaryIntent('summarize this case')).toBe(true);
		expect(detectCaseSummaryIntent('Generate case summary')).toBe(true);
		expect(detectCaseSummaryIntent('What happened yesterday?')).toBe(false);
	});

	it('formats summary sections and citations for chat', () => {
		const payload: CaseSummaryResult = {
			caseId: 'c1',
			generatedAt: '2026-03-23T10:00:00.000Z',
			params: { maxSources: 200, maxTextPerSource: 800 },
			evidencePack: {
				packVersion: 1,
				items: [
					{
						id: 'ev1',
						kind: 'timeline_entry',
						sourceId: 'entry-1',
						type: 'OBS',
						createdAt: '2026-03-20T12:00:00.000Z',
						excerpt: 'x'
					}
				]
			},
			summary: {
				primarySuspects: ['A'],
				keyEvents: ['B'],
				evidenceHighlights: [],
				recommendedNextSteps: ['C'],
				openQuestions: []
			},
			citations: [{ evidenceItemIds: ['ev1'], note: 'Supports event B' }]
		};
		const out = formatCaseSummaryForChat(payload);
		expect(out).toContain('Primary suspects');
		expect(out).toContain('- A');
		expect(out).toContain('Recommended next steps');
		expect(out).toContain('Citations');
		expect(out).toContain('ev1 (Entry:entry-1)');
	});

	it('returns empty-state message when sections are empty', () => {
		const payload: CaseSummaryResult = {
			caseId: 'c1',
			generatedAt: '2026-03-23T10:00:00.000Z',
			params: { maxSources: 200, maxTextPerSource: 800 },
			evidencePack: { packVersion: 1, items: [] },
			summary: {
				primarySuspects: [],
				keyEvents: [],
				evidenceHighlights: [],
				recommendedNextSteps: [],
				openQuestions: []
			},
			citations: []
		};
		expect(formatCaseSummaryForChat(payload)).toBe('No summary data returned.');
	});

	it('exposes the same section set used by panel and chat', () => {
		const payload: CaseSummaryResult = {
			caseId: 'c1',
			generatedAt: '2026-03-23T10:00:00.000Z',
			params: { maxSources: 200, maxTextPerSource: 800 },
			evidencePack: { packVersion: 1, items: [] },
			summary: {
				primarySuspects: ['A'],
				keyEvents: ['B'],
				evidenceHighlights: [],
				recommendedNextSteps: ['C'],
				openQuestions: []
			},
			citations: []
		};
		expect(caseSummarySections(payload).map((s) => s.title)).toEqual([
			'Primary suspects',
			'Key events',
			'Recommended next steps'
		]);
		expect(hasLimitedCaseSummaryData(payload)).toBe(false);
	});

	it('flags limited summaries for low-data cases', () => {
		const payload: CaseSummaryResult = {
			caseId: 'c1',
			generatedAt: '2026-03-23T10:00:00.000Z',
			params: { maxSources: 200, maxTextPerSource: 800 },
			evidencePack: { packVersion: 1, items: [] },
			summary: {
				primarySuspects: ['A'],
				keyEvents: [],
				evidenceHighlights: [],
				recommendedNextSteps: [],
				openQuestions: []
			},
			citations: []
		};
		expect(hasLimitedCaseSummaryData(payload)).toBe(true);
	});
});
