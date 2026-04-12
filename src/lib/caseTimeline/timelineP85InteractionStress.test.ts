/**
 * P85-02 — Interaction reliability under rapid input (relate + follow-up reducers).
 * Pure synchronous state — no async races; tests lock deterministic outcomes and invariants.
 */
import { describe, it, expect } from 'vitest';
import { nextRelateState, type RelateUiState } from './timelineEntryRelateUi';
import { toggleFollowUpEntryId } from './timelineEntryFollowUpUi';

function assertRelateInvariants(s: RelateUiState): void {
	expect(s.pair === null || s.pendingId === null).toBe(true);
	if (s.pair) {
		expect(s.pair.a < s.pair.b).toBe(true);
	}
}

describe('P85-02 relate — rapid and mixed sequences', () => {
	it('100 successive clicks on the same id from idle end at idle (spam clear)', () => {
		let s: RelateUiState = { pendingId: null, pair: null };
		for (let i = 0; i < 100; i++) {
			s = nextRelateState(s, 'row-a');
			assertRelateInvariants(s);
		}
		expect(s).toEqual({ pendingId: null, pair: null });
	});

	it('101 successive clicks on the same id end pending (odd)', () => {
		let s: RelateUiState = { pendingId: null, pair: null };
		for (let i = 0; i < 101; i++) {
			s = nextRelateState(s, 'row-a');
			assertRelateInvariants(s);
		}
		expect(s).toEqual({ pendingId: 'row-a', pair: null });
	});

	it('rapid pair formation and clearing on alternating two ids (6 steps → idle)', () => {
		let s: RelateUiState = { pendingId: null, pair: null };
		// pending e2 → pair → clear → pending e1 → pair → clear (click second member)
		const seq = ['e1', 'e2', 'e1', 'e2', 'e1', 'e2'];
		for (const id of seq) {
			s = nextRelateState(s, id);
			assertRelateInvariants(s);
		}
		expect(s).toEqual({ pendingId: null, pair: null });
	});

	it('interrupt pending with third id then completes pair (partial flow)', () => {
		let s: RelateUiState = { pendingId: null, pair: null };
		s = nextRelateState(s, 'a');
		expect(s.pendingId).toBe('a');
		s = nextRelateState(s, 'c');
		expect(s.pair).not.toBeNull();
		expect(s.pair).toEqual({ a: 'a', b: 'c' });
		s = nextRelateState(s, 'b');
		expect(s).toEqual({ pendingId: 'b', pair: null });
	});

	it('500-step fuzz on three ids never violates invariants', () => {
		let s: RelateUiState = { pendingId: null, pair: null };
		const ids = ['x', 'y', 'z'];
		for (let i = 0; i < 500; i++) {
			s = nextRelateState(s, ids[i % 3]);
			assertRelateInvariants(s);
		}
	});

	it('deterministic final state after fixed burst (multi-row)', () => {
		const clicks = ['a', 'b', 'b', 'a', 'c', 'c', 'a', 'b'];
		let s: RelateUiState = { pendingId: null, pair: null };
		for (const id of clicks) {
			s = nextRelateState(s, id);
		}
		assertRelateInvariants(s);
		expect(s.pair).toEqual({ a: 'a', b: 'b' });
		expect(s.pendingId).toBeNull();
	});
});

describe('P85-02 follow-up — rapid toggles and cross-row isolation', () => {
	it('100 rapid toggles on one id return to empty set', () => {
		let set = new Set<string>();
		for (let i = 0; i < 100; i++) {
			set = toggleFollowUpEntryId(set, 'only');
		}
		expect(set.size).toBe(0);
		expect(set.has('only')).toBe(false);
	});

	it('rapid interleaved toggles on four rows yield exact final membership', () => {
		let set = new Set<string>();
		const pattern = ['r1', 'r2', 'r1', 'r3', 'r2', 'r4', 'r3', 'r1', 'r4'];
		for (const id of pattern) {
			set = toggleFollowUpEntryId(set, id);
		}
		expect([...set].sort()).toEqual(['r1']);
	});

	it('independent ids do not cross-contaminate', () => {
		let set = toggleFollowUpEntryId(new Set(), 'a');
		set = toggleFollowUpEntryId(set, 'b');
		set = toggleFollowUpEntryId(set, 'a');
		expect([...set].sort()).toEqual(['b']);
	});
});
