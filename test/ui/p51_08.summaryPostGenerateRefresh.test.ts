/**
 * P51-08 — Summary tab merges POST generate payload with GET status (no second source of truth).
 */
import { describe, it, expect } from 'vitest';
import { applyStatusOntoPostSnapshot } from '../../src/lib/case/summaryTabSnapshotMerge';
import type { CaseSummaryResult, CaseSummaryStatusResult } from '../../src/lib/apis/caseEngine';

function makePost(overrides: Partial<CaseSummaryResult> = {}): CaseSummaryResult {
	const base: CaseSummaryResult = {
		caseId: 'case-1',
		generatedAt: '2026-04-07T15:00:00Z',
		params: { maxSources: 200, maxTextPerSource: 800 },
		evidencePack: { packVersion: 1, items: [] },
		summary: {
			primarySuspects: ['A'],
			keyEvents: ['B'],
			evidenceHighlights: ['C'],
			recommendedNextSteps: ['D'],
			openQuestions: ['E']
		},
		citations: [{ evidenceItemIds: ['e1'], note: 'n' }]
	};
	return { ...base, ...overrides };
}

describe('P51-08 summary post-generate merge', () => {
	it('uses POST snapshot when GET status.summary is null (audit lag / missing)', () => {
		const post = makePost();
		const status: CaseSummaryStatusResult = {
			summary: null,
			lastSummaryGeneratedAt: null,
			latestActivityAt: '2026-04-06T10:00:00Z',
			isStale: false
		};
		const merged = applyStatusOntoPostSnapshot(post, status);
		expect(merged.summary).toBe(post);
		expect(merged.lastSummaryGeneratedAt).toBe(post.generatedAt);
		expect(merged.latestActivityAt).toBe(status.latestActivityAt);
		expect(merged.isStale).toBe(false);
	});

	it('prefers GET summary when present (server snapshot from audit)', () => {
		const post = makePost({ summary: { ...makePost().summary, primarySuspects: ['from-post'] } });
		const fromAudit = makePost({
			generatedAt: '2026-04-07T16:00:00Z',
			summary: { ...makePost().summary, primarySuspects: ['from-audit'] }
		});
		const status: CaseSummaryStatusResult = {
			summary: fromAudit,
			lastSummaryGeneratedAt: '2026-04-07T16:00:00Z',
			latestActivityAt: '2026-04-07T12:00:00Z',
			isStale: true
		};
		const merged = applyStatusOntoPostSnapshot(post, status);
		expect(merged.summary.summary.primarySuspects).toEqual(['from-audit']);
		expect(merged.lastSummaryGeneratedAt).toBe('2026-04-07T16:00:00Z');
		expect(merged.isStale).toBe(true);
	});

	it('uses status.lastSummaryGeneratedAt when set even if summary fell back to post', () => {
		const post = makePost();
		const status: CaseSummaryStatusResult = {
			summary: null,
			lastSummaryGeneratedAt: '2026-04-07T17:00:00Z',
			latestActivityAt: '2026-04-07T12:00:00Z',
			isStale: false
		};
		const merged = applyStatusOntoPostSnapshot(post, status);
		expect(merged.summary).toBe(post);
		expect(merged.lastSummaryGeneratedAt).toBe('2026-04-07T17:00:00Z');
	});
});
