import { describe, it, expect } from 'vitest';
import {
	nextRelateState,
	normalizeRelationPair,
	isEntryInRelationPair,
	type RelateUiState
} from './timelineEntryRelateUi';

describe('timelineEntryRelateUi (P84-03)', () => {
	it('first click sets pending source', () => {
		const s: RelateUiState = { pendingId: null, pair: null };
		expect(nextRelateState(s, 'e1')).toEqual({ pendingId: 'e1', pair: null });
	});

	it('click same entry clears pending', () => {
		const s: RelateUiState = { pendingId: 'e1', pair: null };
		expect(nextRelateState(s, 'e1')).toEqual({ pendingId: null, pair: null });
	});

	it('second distinct entry forms sorted pair', () => {
		const s: RelateUiState = { pendingId: 'e1', pair: null };
		expect(nextRelateState(s, 'e2')).toEqual({
			pendingId: null,
			pair: normalizeRelationPair('e1', 'e2')
		});
	});

	it('click on either paired entry clears pair', () => {
		const pair = normalizeRelationPair('a', 'b');
		const s: RelateUiState = { pendingId: null, pair };
		expect(nextRelateState(s, 'a')).toEqual({ pendingId: null, pair: null });
		expect(nextRelateState({ pendingId: null, pair }, 'b')).toEqual({
			pendingId: null,
			pair: null
		});
	});

	it('third entry while pair exists clears pair and sets new pending', () => {
		const pair = normalizeRelationPair('a', 'b');
		const s: RelateUiState = { pendingId: null, pair };
		expect(nextRelateState(s, 'c')).toEqual({ pendingId: 'c', pair: null });
	});

	it('normalizeRelationPair is stable', () => {
		expect(normalizeRelationPair('z', 'a')).toEqual({ a: 'a', b: 'z' });
		expect(normalizeRelationPair('m', 'n')).toEqual({ a: 'm', b: 'n' });
	});

	it('normalizeRelationPair with identical ids is deterministic (P85-06 — not used by UI pairing)', () => {
		expect(normalizeRelationPair('x', 'x')).toEqual({ a: 'x', b: 'x' });
	});

	it('isEntryInRelationPair', () => {
		const p = normalizeRelationPair('x', 'y');
		expect(isEntryInRelationPair('x', p)).toBe(true);
		expect(isEntryInRelationPair('y', p)).toBe(true);
		expect(isEntryInRelationPair('z', p)).toBe(false);
		expect(isEntryInRelationPair('z', null)).toBe(false);
	});
});
