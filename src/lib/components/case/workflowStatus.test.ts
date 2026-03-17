/**
 * P13-05: Unit tests for type-aware workflow status helper.
 * Ensures UI only presents valid statuses per type (no impossible combinations).
 */
import { describe, it, expect } from 'vitest';
import {
	getStatusesForType,
	isValidStatusForType,
	WORKFLOW_STATUS_BY_TYPE,
	type WorkflowItemType
} from './workflowStatus';

describe('workflowStatus', () => {
	it('returns correct statuses for HYPOTHESIS', () => {
		const statuses = getStatusesForType('HYPOTHESIS');
		expect(statuses).toContain('OPEN');
		expect(statuses).toContain('IN_PROGRESS');
		expect(statuses).toContain('SUPPORTED');
		expect(statuses).toContain('REJECTED');
		expect(statuses).toContain('CLOSED');
		expect(statuses).not.toContain('ASSIGNED');
		expect(statuses).not.toContain('RESOLVED');
		expect(statuses.length).toBe(5);
	});

	it('returns correct statuses for GAP', () => {
		const statuses = getStatusesForType('GAP');
		expect(statuses).toContain('OPEN');
		expect(statuses).toContain('ASSIGNED');
		expect(statuses).toContain('IN_PROGRESS');
		expect(statuses).toContain('RESOLVED');
		expect(statuses).toContain('CLOSED');
		expect(statuses).not.toContain('SUPPORTED');
		expect(statuses).not.toContain('REJECTED');
		expect(statuses.length).toBe(5);
	});

	it('isValidStatusForType accepts valid HYPOTHESIS statuses', () => {
		expect(isValidStatusForType('HYPOTHESIS', 'OPEN')).toBe(true);
		expect(isValidStatusForType('HYPOTHESIS', 'IN_PROGRESS')).toBe(true);
		expect(isValidStatusForType('HYPOTHESIS', 'SUPPORTED')).toBe(true);
		expect(isValidStatusForType('HYPOTHESIS', 'open')).toBe(true);
	});

	it('isValidStatusForType rejects invalid status for HYPOTHESIS', () => {
		expect(isValidStatusForType('HYPOTHESIS', 'ASSIGNED')).toBe(false);
		expect(isValidStatusForType('HYPOTHESIS', 'RESOLVED')).toBe(false);
	});

	it('isValidStatusForType accepts valid GAP statuses', () => {
		expect(isValidStatusForType('GAP', 'OPEN')).toBe(true);
		expect(isValidStatusForType('GAP', 'ASSIGNED')).toBe(true);
		expect(isValidStatusForType('GAP', 'RESOLVED')).toBe(true);
	});

	it('isValidStatusForType rejects invalid status for GAP', () => {
		expect(isValidStatusForType('GAP', 'SUPPORTED')).toBe(false);
		expect(isValidStatusForType('GAP', 'REJECTED')).toBe(false);
	});

	it('WORKFLOW_STATUS_BY_TYPE matches backend (single source of truth)', () => {
		expect(WORKFLOW_STATUS_BY_TYPE.HYPOTHESIS).toEqual([
			'OPEN',
			'IN_PROGRESS',
			'SUPPORTED',
			'REJECTED',
			'CLOSED'
		]);
		expect(WORKFLOW_STATUS_BY_TYPE.GAP).toEqual([
			'OPEN',
			'ASSIGNED',
			'IN_PROGRESS',
			'RESOLVED',
			'CLOSED'
		]);
	});
});
