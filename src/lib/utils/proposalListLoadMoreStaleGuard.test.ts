import { describe, it, expect } from 'vitest';
import { isStaleProposalsLoadMoreAppend } from './proposalListLoadMoreStaleGuard';

describe('isStaleProposalsLoadMoreAppend', () => {
	it('is stale when load id advanced (full reload superseded load-more)', () => {
		expect(isStaleProposalsLoadMoreAppend(1, 2, 'c1', 'c1')).toBe(true);
	});

	it('is stale when case changed', () => {
		expect(isStaleProposalsLoadMoreAppend(3, 3, 'c-old', 'c-new')).toBe(true);
	});

	it('is fresh when id and case match', () => {
		expect(isStaleProposalsLoadMoreAppend(4, 4, 'c1', 'c1')).toBe(false);
	});
});
