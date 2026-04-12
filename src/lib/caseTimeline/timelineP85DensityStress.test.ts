/**
 * P85-01 — Timeline stress & density: large-list ordering remains deterministic
 * (mirrors real-world load: many rows, mixed timestamps, long text payloads).
 */
import { describe, it, expect } from 'vitest';
import {
	compareTimelineEntriesOfficialOrder,
	sortTimelineEntriesOfficialOrder,
	type TimelineEntrySortable
} from './timelineEntriesOfficialSort';

/** Build N rows with unique ids, mixed occurred_at, and long text (ignored by sort). */
function buildDenseMockEntries(n: number): Array<TimelineEntrySortable & { text_original: string }> {
	const rows: Array<TimelineEntrySortable & { text_original: string }> = [];
	for (let i = 0; i < n; i++) {
		const day = (i % 28) + 1;
		const hour = i % 24;
		rows.push({
			id: `stress-${String(i).padStart(5, '0')}`,
			occurred_at: `2024-06-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:15:00.000Z`,
			text_original: i % 17 === 0 ? 'PARAGRAPH\n'.repeat(120) : 'short'
		});
	}
	return rows;
}

describe('P85-01 density stress (official order under large lists)', () => {
	it('sorts 400 mixed entries deterministically (occurred_at ASC, id ASC)', () => {
		const rows = buildDenseMockEntries(400);
		const reversed = [...rows].reverse();
		const sorted = sortTimelineEntriesOfficialOrder(reversed);
		expect(sorted).toHaveLength(400);
		for (let i = 0; i < sorted.length - 1; i++) {
			expect(compareTimelineEntriesOfficialOrder(sorted[i], sorted[i + 1])).toBeLessThanOrEqual(0);
		}
		const byId = new Set(sorted.map((r) => r.id));
		expect(byId.size).toBe(400);
	});

	it('tie-breaks 500 same-timestamp rows by id ASC (dense same-minute grid)', () => {
		const t = '2025-03-15T14:00:00.000Z';
		const rows = Array.from({ length: 500 }, (_, i) => ({
			id: `id-${String(499 - i).padStart(4, '0')}`,
			occurred_at: t,
			text_original: 'x'.repeat(i * 10)
		}));
		const sorted = sortTimelineEntriesOfficialOrder(rows);
		expect(sorted.map((r) => r.id)).toEqual(
			Array.from({ length: 500 }, (_, i) => `id-${String(i).padStart(4, '0')}`)
		);
	});

	it('does not mutate a 300-row input when sorting', () => {
		const rows = buildDenseMockEntries(300);
		const beforeFirst = rows[0].id;
		sortTimelineEntriesOfficialOrder(rows);
		expect(rows[0].id).toBe(beforeFirst);
	});
});
