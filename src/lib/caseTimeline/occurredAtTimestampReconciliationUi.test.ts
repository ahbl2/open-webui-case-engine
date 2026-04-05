import { describe, expect, it } from 'vitest';
import {
	occurredAtTimestampReconciliationBadgeClass,
	occurredAtTimestampReconciliationLabel
} from './occurredAtTimestampReconciliationUi';

describe('occurredAtTimestampReconciliationUi (P41-05)', () => {
	it('labels known reconciliation states', () => {
		expect(occurredAtTimestampReconciliationLabel('exact_match')).toMatch(/Exact match/i);
		expect(occurredAtTimestampReconciliationLabel('conflict')).toMatch(/Conflict/i);
	});

	it('falls back to raw state string for unknown future enums', () => {
		expect(occurredAtTimestampReconciliationLabel('future_state_xyz')).toBe('future_state_xyz');
	});

	it('returns a badge class for unknown states without throwing', () => {
		expect(occurredAtTimestampReconciliationBadgeClass('future_state_xyz')).toContain('bg-gray');
	});
});
