/**
 * P103-05 — Cross-surface navigation hardening: case boundaries, repeatability, goto wiring.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CitationNavigationPayload } from './p103CitationNavigationTypes';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(() => Promise.resolve())
}));

import { goto } from '$app/navigation';
import {
	citationNavigationIntentFromPayload,
	navigateToCitationNavigationPayload
} from './p103CitationNavigationIntent';
import {
	P103_QUERY_NAVIGATION_CASE_MISMATCH_COPY,
	P103_QUERY_NAVIGATION_FAILED_COPY,
	P103_REVEAL_NOT_FOUND_TIMELINE_COPY
} from './p103NavigationOperatorCopy';
import { resolveQueryCitationNavigation } from './p103QueryCitationNavigation';
import type { CaseQueryCitation } from '$lib/apis/caseEngine/caseQueryApi';

const timelinePayload = (caseId: string, targetId: string): CitationNavigationPayload => ({
	contract_version: 'p103.1',
	case_id: caseId,
	citation_kind: 'timeline_entry',
	target_id: targetId,
	route_key: 'timeline'
});

describe('P103-05 navigateToCitationNavigationPayload', () => {
	beforeEach(() => {
		vi.mocked(goto).mockClear();
	});

	it('navigates when payload case_id has surrounding whitespace and active case matches trim', async () => {
		const res = await navigateToCitationNavigationPayload(timelinePayload('  c9  ', 'e1'), 'c9');
		expect(res.ok).toBe(true);
		expect(goto).toHaveBeenCalledWith(
			'/case/c9/timeline',
			expect.objectContaining({
				state: expect.objectContaining({ p103CitationNavigationIntent: expect.any(Object) })
			})
		);
	});

	it('rejects case id mismatch after normalization', async () => {
		const res = await navigateToCitationNavigationPayload(timelinePayload('c1', 'e1'), 'c2');
		expect(res.ok).toBe(false);
		expect(res).toEqual({ ok: false, reason: 'CASE_ID_MISMATCH' });
		expect(goto).not.toHaveBeenCalled();
	});

	it('is repeatable for the same payload', async () => {
		const p = timelinePayload('c1', 'e1');
		const a = await navigateToCitationNavigationPayload(p, 'c1');
		const b = await navigateToCitationNavigationPayload(p, 'c1');
		expect(a).toEqual(b);
		expect(goto).toHaveBeenCalledTimes(2);
	});
});

describe('P103-05 query copy constants', () => {
	it('exposes non-empty shared strings', () => {
		expect(P103_QUERY_NAVIGATION_CASE_MISMATCH_COPY.length).toBeGreaterThan(10);
		expect(P103_QUERY_NAVIGATION_FAILED_COPY.length).toBeGreaterThan(10);
		expect(P103_REVEAL_NOT_FOUND_TIMELINE_COPY.length).toBeGreaterThan(10);
	});
});

describe('P103-05 query → intent repeatability', () => {
	it('produces identical intents for repeated resolution of the same citation', () => {
		const c: CaseQueryCitation = { kind: 'case_task', id: 'k1' };
		const a = resolveQueryCitationNavigation('case-a', 'case-a', c);
		const b = resolveQueryCitationNavigation('case-a', 'case-a', c);
		expect(a).toEqual(b);
		if (a.kind === 'navigable' && b.kind === 'navigable') {
			expect(citationNavigationIntentFromPayload(a.payload)).toEqual(
				citationNavigationIntentFromPayload(b.payload)
			);
		}
	});
});
