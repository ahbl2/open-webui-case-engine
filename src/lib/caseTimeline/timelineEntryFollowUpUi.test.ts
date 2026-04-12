import { describe, it, expect } from 'vitest';
import { toggleFollowUpEntryId, removeFollowUpEntryId } from './timelineEntryFollowUpUi';

describe('timelineEntryFollowUpUi (P84-04)', () => {
	it('toggleFollowUpEntryId adds id when absent', () => {
		const s = toggleFollowUpEntryId(new Set(), 'a');
		expect(s.has('a')).toBe(true);
		expect(s.size).toBe(1);
	});

	it('toggleFollowUpEntryId removes id when present', () => {
		const s = toggleFollowUpEntryId(new Set(['a', 'b']), 'a');
		expect(s.has('a')).toBe(false);
		expect(s.has('b')).toBe(true);
	});

	it('toggleFollowUpEntryId does not mutate input set', () => {
		const orig = new Set(['x']);
		const s = toggleFollowUpEntryId(orig, 'y');
		expect(orig.has('y')).toBe(false);
		expect(s.has('y')).toBe(true);
	});

	it('removeFollowUpEntryId drops one id', () => {
		const s = removeFollowUpEntryId(new Set(['a', 'b']), 'a');
		expect(s.has('a')).toBe(false);
		expect(s.has('b')).toBe(true);
	});

	it('removeFollowUpEntryId is a no-op when id was not marked (P85-06)', () => {
		const orig = new Set(['a']);
		const s = removeFollowUpEntryId(orig, 'missing');
		expect([...s].sort()).toEqual(['a']);
		expect(orig.has('a')).toBe(true);
	});
});
